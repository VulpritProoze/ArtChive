"""
Management command to calculate initial reputation from existing BrushDripTransaction records.

Usage:
    python manage.py calculate_initial_reputation [--dry-run] [--batch-size=1000]
"""

from collections import defaultdict
from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import BrushDripTransaction, ReputationHistory, User
from core.reputation import get_reputation_amount_for_critique
from post.models import Critique


class Command(BaseCommand):
    help = 'Calculate initial reputation for all users from existing BrushDripTransaction records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making changes (for testing)',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Batch size for bulk operations (default: 1000)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        batch_size = options['batch_size']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be saved'))

        self.stdout.write('Calculating initial reputation from transactions...')

        # Dictionary to store reputation changes per user
        user_reputation = defaultdict(int)
        # List to store ReputationHistory records
        history_records = []

        # Query all transactions with related user
        transactions = BrushDripTransaction.objects.select_related(
            'transacted_to'
        ).filter(
            transacted_to__isnull=False
        ).order_by('transacted_at')

        total_transactions = transactions.count()
        self.stdout.write(f'Processing {total_transactions} transactions...')

        # Collect critique IDs to batch query
        critique_ids = []
        critique_transactions = []

        # Process transactions
        for idx, txn in enumerate(transactions, 1):
            if idx % 1000 == 0:
                self.stdout.write(f'  Processed {idx}/{total_transactions} transactions...')

            user = txn.transacted_to
            if not user or user.is_deleted:
                continue

            transaction_type = txn.transaction_object_type
            amount = txn.amount
            source_id = txn.transaction_object_id

            # Calculate reputation based on transaction type
            if transaction_type == 'praise':
                # Praise: +1 reputation
                reputation_change = 1
                source_type = 'praise'
                source_object_type = 'post'
                description = 'Received praise on post'

            elif transaction_type == 'trophy':
                # Trophy: +amount reputation (amount matches BD granted)
                reputation_change = amount
                source_type = 'trophy'
                source_object_type = 'post'
                description = f'Received trophy on post (value: {amount} BD)'

            elif transaction_type == 'gallery_award':
                # Gallery award: +amount reputation
                reputation_change = amount
                source_type = 'gallery_award'
                source_object_type = 'gallery'
                description = f'Received gallery award (value: {amount} BD)'

            elif transaction_type == 'critique':
                # Critique: Need to query Critique model for impression
                critique_ids.append(source_id)
                critique_transactions.append((txn, user))
                continue  # Process critiques in batch later

            else:
                # Unknown transaction type - skip
                continue

            # Add to user reputation
            user_reputation[user.id] += reputation_change

            # Create history record
            history_records.append(
                ReputationHistory(
                    user=user,
                    amount=reputation_change,
                    source_type=source_type,
                    source_id=source_id,
                    source_object_type=source_object_type,
                    description=description,
                    created_at=txn.transacted_at
                )
            )

        # Process critiques in batch
        if critique_ids:
            self.stdout.write(f'Processing {len(critique_ids)} critiques...')
            
            # Query all critiques at once
            critiques_dict = {}
            # Note: gallery_id may not exist yet (Phase 7), so we'll handle it gracefully
            critique_fields = ['critique_id', 'impression', 'post_id']
            if hasattr(Critique, 'gallery_id'):
                critique_fields.append('gallery_id')
            
            critiques = Critique.objects.filter(
                critique_id__in=critique_ids
            ).values(*critique_fields)

            for critique in critiques:
                critiques_dict[str(critique['critique_id'])] = {
                    'impression': critique['impression'],
                    'post_id': critique.get('post_id'),
                    'gallery_id': critique.get('gallery_id'),
                }

            # Process each critique transaction
            for txn, user in critique_transactions:
                source_id = txn.transaction_object_id
                critique_data = critiques_dict.get(source_id)

                if not critique_data:
                    # Critique not found - skip
                    continue

                impression = critique_data['impression']
                reputation_change = get_reputation_amount_for_critique(impression)

                if reputation_change == 0:
                    # Neutral critique - no reputation change
                    continue

                # Determine object type
                source_object_type = None
                if critique_data.get('post_id'):
                    source_object_type = 'post'
                elif critique_data.get('gallery_id'):
                    source_object_type = 'gallery'

                # Add to user reputation
                user_reputation[user.id] += reputation_change

                # Create history record
                history_records.append(
                    ReputationHistory(
                        user=user,
                        amount=reputation_change,
                        source_type='critique',
                        source_id=source_id,
                        source_object_type=source_object_type,
                        description=f'Received {impression} critique',
                        created_at=txn.transacted_at
                    )
                )

        # Update users with calculated reputation
        self.stdout.write(f'\nUpdating {len(user_reputation)} users...')

        if not dry_run:
            # Prepare users for bulk update
            users_to_update = []
            for user_id, reputation in user_reputation.items():
                try:
                    user = User.objects.get(pk=user_id, is_deleted=False)
                    user.reputation = reputation
                    users_to_update.append(user)
                except User.DoesNotExist:
                    continue

            # Bulk update users
            if users_to_update:
                User.objects.bulk_update(users_to_update, ['reputation'], batch_size=batch_size)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Updated {len(users_to_update)} users with reputation'
                    )
                )

            # Bulk create history records
            if history_records:
                self.stdout.write(f'Creating {len(history_records)} history records...')
                ReputationHistory.objects.bulk_create(
                    history_records,
                    batch_size=batch_size,
                    ignore_conflicts=True  # In case of duplicates
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Created {len(history_records)} reputation history records'
                    )
                )
        else:
            # Dry run - just show what would be done
            self.stdout.write(f'\nWould update {len(user_reputation)} users:')
            for user_id, reputation in list(user_reputation.items())[:10]:  # Show first 10
                try:
                    user = User.objects.get(pk=user_id)
                    self.stdout.write(f'  User {user.username} (ID: {user_id}): {reputation:+d} reputation')
                except User.DoesNotExist:
                    pass
            
            if len(user_reputation) > 10:
                self.stdout.write(f'  ... and {len(user_reputation) - 10} more users')
            
            self.stdout.write(f'\nWould create {len(history_records)} history records')

        # Summary
        total_reputation = sum(user_reputation.values())
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSummary:\n'
                f'  Users updated: {len(user_reputation)}\n'
                f'  Total reputation points: {total_reputation}\n'
                f'  History records: {len(history_records)}'
            )
        )


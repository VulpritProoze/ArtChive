
from collections import OrderedDict

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class PostPagination(PageNumberPagination):
    page_size = 5  # Default number of posts per page
    max_page_size = 100  # Maximum limit per page

class CommentPagination(PageNumberPagination):
    page_size = 10  # Default number of comments per page
    max_page_size = 100  # Maximum limit
    extra_data = {}

    def get_paginated_response(self, data):
        response = OrderedDict([
            ('count', self.page.paginator.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('results', data)
        ])
        # Add extra fields if available
        if hasattr(self, 'extra_data'):
            response.update(self.extra_data)
        return Response(response)

class CritiquePagination(PageNumberPagination):
    page_size = 10
    max_page_size = 100

class PostListPagination(PageNumberPagination):
    """Pagination for post-related lists (hearts, praises, trophies)"""
    page_size = 20
    max_page_size = 100

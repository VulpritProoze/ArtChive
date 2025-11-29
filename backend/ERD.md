# ArtChive Project - Entity Relationship Diagram

## Overview

This document describes the complete database schema for the ArtChive project, covering all major modules: Core, Avatar, Collective, Post, Gallery, and Notification.

---

## Entity Relationship Diagram (Text Format)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            ARTCHIVE PROJECT                              │
└─────────────────────────────────────────────────────────────────────────┘

       ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
       │     Core     │<───────>│  Collective  │<───────>│     Post     │
       └──────┬───────┘         └──────┬───────┘         └──────┬───────┘
              │                        │                        │
              │                        │                        │
       ┌──────▼───────┐         ┌──────▼───────┐         ┌──────▼───────┐
       │    Avatar    │         │ Notification │         │   Gallery    │
       └──────────────┘         └──────────────┘         └──────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              CORE MODULE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│ User (AbstractUser)                                                     │
│ ├── Artist (OneToOne)                                                   │
│ ├── BrushDripWallet (OneToOne)                                          │
│ ├── UserFellow (Self-referential M2M)                                   │
│ └── BrushDripTransaction (History)                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                             AVATAR MODULE                                │
├─────────────────────────────────────────────────────────────────────────┤
│ Avatar                                                                  │
│ └── FK to User                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           COLLECTIVE MODULE                              │
├─────────────────────────────────────────────────────────────────────────┤
│ Collective                                                              │
│ ├── CollectiveMember (M2M with User)                                    │
│ ├── Channel (1:N)                                                       │
│ └── AdminRequest (1:N)                                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              POST MODULE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│ Post                                                                    │
│ ├── NovelPost (1:1 extension)                                           │
│ ├── PostHeart (1:N)                                                     │
│ ├── PostPraise (1:N)                                                    │
│ ├── PostTrophy (1:N) -> TrophyType                                      │
│ ├── Comment (1:N)                                                       │
│ └── Critique (1:N)                                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                             GALLERY MODULE                               │
├─────────────────────────────────────────────────────────────────────────┤
│ Gallery                                                                 │
│ └── GalleryAward (1:N) -> AwardType                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          NOTIFICATION MODULE                             │
├─────────────────────────────────────────────────────────────────────────┤
│ Notification                                                            │
│ └── NotificationNotifier (1:N)                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## PostgreSQL Database Schema (DDL)

```sql
-- ============================================================================
-- CORE MODULE
-- ============================================================================

CREATE TABLE core_user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(254) UNIQUE NOT NULL,
    first_name VARCHAR(255),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    city VARCHAR(100) DEFAULT 'N/A',
    country VARCHAR(100) DEFAULT 'N/A',
    contact_no VARCHAR(20) DEFAULT 'N/A',
    birthday DATE,
    is_deleted BOOLEAN DEFAULT FALSE,
    profile_picture VARCHAR(100) DEFAULT 'static/images/default-pic-min.jpg',
    -- Django auth fields...
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    is_superuser BOOLEAN DEFAULT FALSE,
    is_staff BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    date_joined TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE core_artist (
    user_id_id INTEGER PRIMARY KEY REFERENCES core_user(id) ON DELETE CASCADE,
    artist_types TEXT[]  -- ArrayField
);

CREATE TABLE core_userfellow (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES core_user(id) ON DELETE CASCADE,
    fellow_user_id INTEGER NOT NULL REFERENCES core_user(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    fellowed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE core_brushdripwallet (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES core_user(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE core_brushdriptransaction (
    drip_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount INTEGER DEFAULT 0,
    transaction_object_type VARCHAR(500) NOT NULL,
    transaction_object_id VARCHAR(2000) NOT NULL,
    transacted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    transacted_by_id INTEGER REFERENCES core_user(id) ON DELETE SET NULL,
    transacted_to_id INTEGER REFERENCES core_user(id) ON DELETE SET NULL
);

-- ============================================================================
-- AVATAR MODULE
-- ============================================================================

CREATE TABLE avatar_avatar (
    avatar_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES core_user(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT 'My Avatar',
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    is_primary BOOLEAN DEFAULT FALSE,
    canvas_json JSONB,
    rendered_image VARCHAR(100),
    thumbnail VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- COLLECTIVE MODULE
-- ============================================================================

CREATE TABLE collective_collective (
    collective_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(4096) NOT NULL,
    rules TEXT[],
    artist_types TEXT[],
    picture VARCHAR(100) DEFAULT 'static/images/default_600x400.png',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collective_collectivemember (
    id SERIAL PRIMARY KEY,
    collective_id_id UUID NOT NULL REFERENCES collective_collective(collective_id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES core_user(id) ON DELETE CASCADE,
    collective_role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collective_channel (
    channel_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(512) NOT NULL,
    channel_type VARCHAR(50) DEFAULT 'post_channel',
    description VARCHAR(4096) NOT NULL,
    collective_id UUID NOT NULL REFERENCES collective_collective(collective_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collective_adminrequest (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collective_id UUID NOT NULL REFERENCES collective_collective(collective_id) ON DELETE CASCADE,
    requester_id INTEGER NOT NULL REFERENCES core_user(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    message TEXT,
    reviewed_by_id INTEGER REFERENCES core_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- POST MODULE
-- ============================================================================

CREATE TABLE post_post (
    post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    image_url VARCHAR(100),
    video_url VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    post_type VARCHAR(100) NOT NULL,
    author_id INTEGER NOT NULL REFERENCES core_user(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES collective_channel(channel_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_novelpost (
    id SERIAL PRIMARY KEY,
    post_id_id UUID NOT NULL REFERENCES post_post(post_id) ON DELETE CASCADE,
    chapter INTEGER NOT NULL CHECK (chapter > 0),
    content TEXT NOT NULL
);

CREATE TABLE post_postheart (
    id SERIAL PRIMARY KEY,
    post_id_id UUID NOT NULL REFERENCES post_post(post_id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES core_user(id) ON DELETE CASCADE,
    hearted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_postpraise (
    id SERIAL PRIMARY KEY,
    post_id_id UUID NOT NULL REFERENCES post_post(post_id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES core_user(id) ON DELETE CASCADE,
    praised_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_trophytype (
    id SERIAL PRIMARY KEY,
    trophy VARCHAR(100) NOT NULL,
    brush_drip_value INTEGER NOT NULL
);

CREATE TABLE post_posttrophy (
    id SERIAL PRIMARY KEY,
    post_id_id UUID NOT NULL REFERENCES post_post(post_id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES core_user(id) ON DELETE CASCADE,
    post_trophy_type_id INTEGER NOT NULL REFERENCES post_trophytype(id) ON DELETE RESTRICT,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_critique (
    critique_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    impression VARCHAR(100) NOT NULL,
    post_id UUID REFERENCES post_post(post_id) ON DELETE SET NULL,
    author_id INTEGER REFERENCES core_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_comment (
    comment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    post_id UUID REFERENCES post_post(post_id) ON DELETE SET NULL,
    is_critique_reply BOOLEAN DEFAULT FALSE,
    critique_id_id UUID REFERENCES post_critique(critique_id) ON DELETE SET NULL,
    author_id INTEGER REFERENCES core_user(id) ON DELETE SET NULL,
    replies_to_id UUID REFERENCES post_comment(comment_id) ON DELETE SET NULL,
    gallery_id UUID, -- Forward reference to gallery table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- GALLERY MODULE
-- ============================================================================

CREATE TABLE gallery_gallery (
    gallery_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(512) NOT NULL,
    description VARCHAR(4096) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    picture VARCHAR(100) DEFAULT 'static/images/default_600x400.png',
    canvas_json JSONB,
    canvas_width INTEGER DEFAULT 1920,
    canvas_height INTEGER DEFAULT 1080,
    is_deleted BOOLEAN DEFAULT FALSE,
    creator_id INTEGER NOT NULL REFERENCES core_user(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add Foreign Key for Comment -> Gallery (circular dependency resolution)
ALTER TABLE post_comment ADD CONSTRAINT fk_comment_gallery FOREIGN KEY (gallery_id) REFERENCES gallery_gallery(gallery_id) ON DELETE SET NULL;

CREATE TABLE gallery_awardtype (
    id SERIAL PRIMARY KEY,
    award VARCHAR(100) NOT NULL,
    brush_drip_value INTEGER NOT NULL
);

CREATE TABLE gallery_galleryaward (
    id SERIAL PRIMARY KEY,
    gallery_id_id UUID NOT NULL REFERENCES gallery_gallery(gallery_id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES core_user(id) ON DELETE CASCADE,
    gallery_award_type_id INTEGER NOT NULL REFERENCES gallery_awardtype(id) ON DELETE RESTRICT,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- NOTIFICATION MODULE
-- ============================================================================

CREATE TABLE notification_notification (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message TEXT NOT NULL,
    notification_object_type VARCHAR(500) NOT NULL,
    notification_object_id VARCHAR(2000) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    notified_to_id INTEGER NOT NULL REFERENCES core_user(id) ON DELETE CASCADE,
    notified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_notificationnotifier (
    id SERIAL PRIMARY KEY,
    notification_id_id UUID NOT NULL REFERENCES notification_notification(notification_id) ON DELETE CASCADE,
    notified_by_id INTEGER NOT NULL REFERENCES core_user(id) ON DELETE CASCADE
);
```

---

## dbdiagram.io Schema (DBML Format)

**Copy and paste the code below into https://dbdiagram.io to generate a visual ERD**

```dbml
// ArtChive Project - Complete Database Schema
// Paste this entire code block into https://dbdiagram.io

// ============================================================================
// CORE MODULE
// ============================================================================

Table core_user {
  id int [pk, increment]
  username varchar [unique, not null]
  email varchar [unique, not null]
  first_name varchar
  last_name varchar
  is_deleted boolean [default: false]
  profile_picture varchar
  // ... other auth fields
}

Table core_artist {
  user_id int [pk, ref: - core_user.id]
  artist_types varchar[]
}

Table core_userfellow {
  id int [pk, increment]
  user_id int [ref: > core_user.id]
  fellow_user_id int [ref: > core_user.id]
  status varchar [default: 'pending']
  fellowed_at timestamp
}

Table core_brushdripwallet {
  id int [pk, increment]
  user_id int [unique, ref: - core_user.id]
  balance int [default: 0]
  updated_at timestamp
}

Table core_brushdriptransaction {
  drip_id uuid [pk]
  amount int
  transaction_object_type varchar
  transaction_object_id varchar
  transacted_at timestamp
  transacted_by_id int [ref: > core_user.id]
  transacted_to_id int [ref: > core_user.id]
}

// ============================================================================
// AVATAR MODULE
// ============================================================================

Table avatar_avatar {
  avatar_id uuid [pk]
  user_id int [ref: > core_user.id]
  name varchar
  status varchar [default: 'draft']
  is_primary boolean [default: false]
  canvas_json json
  rendered_image varchar
  is_deleted boolean [default: false]
  created_at timestamp
}

// ============================================================================
// COLLECTIVE MODULE
// ============================================================================

Table collective_collective {
  collective_id uuid [pk]
  title varchar [unique]
  description varchar
  rules varchar[]
  artist_types varchar[]
  picture varchar
  created_at timestamp
}

Table collective_collectivemember {
  id int [pk, increment]
  collective_id uuid [ref: > collective_collective.collective_id]
  member_id int [ref: > core_user.id]
  collective_role varchar [default: 'member']
  created_at timestamp
}

Table collective_channel {
  channel_id uuid [pk]
  title varchar
  channel_type varchar [default: 'post_channel']
  collective_id uuid [ref: > collective_collective.collective_id]
  created_at timestamp
}

Table collective_adminrequest {
  request_id uuid [pk]
  collective_id uuid [ref: > collective_collective.collective_id]
  requester_id int [ref: > core_user.id]
  status varchar [default: 'pending']
  reviewed_by_id int [ref: > core_user.id]
  created_at timestamp
}

// ============================================================================
// POST MODULE
// ============================================================================

Table post_post {
  post_id uuid [pk]
  description text
  image_url varchar
  video_url varchar
  is_deleted boolean [default: false]
  post_type varchar
  author_id int [ref: > core_user.id]
  channel_id uuid [ref: > collective_channel.channel_id]
  created_at timestamp
}

Table post_novelpost {
  id int [pk, increment]
  post_id uuid [ref: > post_post.post_id]
  chapter int
  content text
}

Table post_postheart {
  id int [pk, increment]
  post_id uuid [ref: > post_post.post_id]
  author_id int [ref: > core_user.id]
  hearted_at timestamp
}

Table post_postpraise {
  id int [pk, increment]
  post_id uuid [ref: > post_post.post_id]
  author_id int [ref: > core_user.id]
  praised_at timestamp
}

Table post_trophytype {
  id int [pk, increment]
  trophy varchar
  brush_drip_value int
}

Table post_posttrophy {
  id int [pk, increment]
  post_id uuid [ref: > post_post.post_id]
  author_id int [ref: > core_user.id]
  post_trophy_type_id int [ref: > post_trophytype.id]
  awarded_at timestamp
}

Table post_critique {
  critique_id uuid [pk]
  text text
  is_deleted boolean [default: false]
  impression varchar
  post_id uuid [ref: > post_post.post_id]
  author_id int [ref: > core_user.id]
  created_at timestamp
}

Table post_comment {
  comment_id uuid [pk]
  text text
  is_deleted boolean [default: false]
  post_id uuid [ref: > post_post.post_id]
  is_critique_reply boolean
  critique_id uuid [ref: > post_critique.critique_id]
  author_id int [ref: > core_user.id]
  replies_to_id uuid [ref: > post_comment.comment_id]
  gallery_id uuid [ref: > gallery_gallery.gallery_id]
  created_at timestamp
}

// ============================================================================
// GALLERY MODULE
// ============================================================================

Table gallery_gallery {
  gallery_id uuid [pk]
  title varchar
  description varchar
  status varchar [default: 'draft']
  picture varchar
  canvas_json json
  is_deleted boolean [default: false]
  creator_id int [ref: > core_user.id]
  created_at timestamp
}

Table gallery_awardtype {
  id int [pk, increment]
  award varchar
  brush_drip_value int
}

Table gallery_galleryaward {
  id int [pk, increment]
  gallery_id uuid [ref: > gallery_gallery.gallery_id]
  author_id int [ref: > core_user.id]
  gallery_award_type_id int [ref: > gallery_awardtype.id]
  awarded_at timestamp
}

// ============================================================================
// NOTIFICATION MODULE
// ============================================================================

Table notification_notification {
  notification_id uuid [pk]
  message text
  notification_object_type varchar
  notification_object_id varchar
  is_read boolean [default: false]
  notified_to_id int [ref: > core_user.id]
  notified_at timestamp
}

Table notification_notificationnotifier {
  id int [pk, increment]
  notification_id uuid [ref: > notification_notification.notification_id]
  notified_by_id int [ref: > core_user.id]
}
```

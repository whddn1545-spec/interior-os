-- instagram_posts 테이블에 hashtags 컬럼 추가
alter table instagram_posts
  add column if not exists hashtags text[] not null default '{}';

-- photo_id (단건) 컬럼 추가 (photo_ids는 기존 유지)
alter table instagram_posts
  add column if not exists photo_id uuid references photos(id);

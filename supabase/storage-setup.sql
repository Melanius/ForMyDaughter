-- 가족 프로필 사진용 Storage 버킷 생성
-- Supabase 콘솔에서 실행하거나 마이그레이션으로 사용

-- 1. family-avatars 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('family-avatars', 'family-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS 정책 설정 (프로필 소유자만 업로드/수정 가능)
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'family-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[2] -- avatars/{user_id}_{timestamp}.jpg
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'family-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'family-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- 3. 모든 사용자가 아바타 이미지를 볼 수 있도록 설정
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'family-avatars');
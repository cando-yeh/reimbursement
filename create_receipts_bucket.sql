-- Create the storage bucket for receipts
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- Policy to allow anyone to upload files (authenticated users usually)
-- For now, we'll allow public uploads to rule out auth issues, or restrict to authenticated
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'receipts' );

-- Policy to allow public to view files
create policy "Allow public viewing"
on storage.objects for select
to public
using ( bucket_id = 'receipts' );

-- Policy to allow users to update their own files (optional)
create policy "Allow authenticated updates"
on storage.objects for update
to authenticated
using ( bucket_id = 'receipts' );

-- Policy to allow users to delete their own files (optional)
create policy "Allow authenticated deletes"
on storage.objects for delete
to authenticated
using ( bucket_id = 'receipts' );

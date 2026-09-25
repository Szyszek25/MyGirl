-- Polka: finish remote Care authoring and video posts.

-- Composer already supports selecting videos; align Storage with the UI.
update storage.buckets
set file_size_limit=20971520,
    allowed_mime_types=array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime']
where id='polka-post-media';

-- Admin/moderator-only remote authoring for Polka Care.
grant insert,update,delete on public.care_articles to authenticated;
grant insert,update,delete on public.care_article_sources to authenticated;

create policy care_articles_admin_insert
on public.care_articles for insert to authenticated
with check(public.polka_is_admin());

create policy care_articles_admin_update
on public.care_articles for update to authenticated
using(public.polka_is_admin())
with check(public.polka_is_admin());

create policy care_articles_admin_delete
on public.care_articles for delete to authenticated
using(public.polka_is_admin());

create policy care_sources_admin_insert
on public.care_article_sources for insert to authenticated
with check(
  public.polka_is_admin()
  and exists(select 1 from public.care_articles a where a.id=article_id)
);

create policy care_sources_admin_update
on public.care_article_sources for update to authenticated
using(public.polka_is_admin())
with check(public.polka_is_admin());

create policy care_sources_admin_delete
on public.care_article_sources for delete to authenticated
using(public.polka_is_admin());

from django.contrib import admin
from django.contrib.admin import ModelAdmin
from .models import Post, Comment, Collective, Critique

admin.site.register(Post)
admin.site.register(Collective)
admin.site.register(Critique)


@admin.register(Comment)
class CommentAdmin(ModelAdmin):
    list_display = [field.name for field in Comment._meta.fields]
    list_filter = ('post_id', 'critique_id',)
    search_fields = ('comment_id', 'text','post_id__description',)
    ordering = ('-created_at',)
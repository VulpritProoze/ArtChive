from django.contrib import admin
from django.contrib.admin import ModelAdmin
from collective.models import CollectiveMember

@admin.register(CollectiveMember)
class CollectiveAdmin(ModelAdmin):
    list_display = [field.name for field in CollectiveMember._meta.get_fields()]
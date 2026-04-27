from django.contrib import admin
from . import models
# Register your models here.
admin.site.register(models.Post)

# @admin.register(models.Post)
# class PostsAdmin(admin.ModelAdmin):
#     list_display = ('id', 'title', 'creator', 'phash','uploaded_at','processing_type') # allows you to see a tabular format
# backend/gallery/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path("images/", views.PostListCreateView.as_view(), name="post-list-create"),
    path("images/<int:pk>/", views.PostDetailView.as_view(), name="post-detail"),
    path("search/", views.ImageSearchView.as_view(), name="image-search"),
]

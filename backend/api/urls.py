from . import views
from django.urls import path

urlpatterns = [
    path("", views.HelloWorld.as_view()),
    path("images/", views.PostsAPIView.as_view(), name="post-list"),
    path("images/<int:pk>/", views.PostsAPIView.as_view(), name="post-detail"),
]

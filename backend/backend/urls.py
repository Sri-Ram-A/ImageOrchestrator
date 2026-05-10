# backend/backend/urls.py
"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)
from django.http import HttpResponse


def intro(request):
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>ImageOrchestrator API</title>

        <style>
            body {
                margin: 0;
                padding: 0;
                background: #0f172a;
                color: #e2e8f0;
                font-family: Arial, sans-serif;

                display: flex;
                justify-content: center;
                align-items: center;

                height: 100vh;
            }

            .container {
                text-align: center;
                max-width: 700px;
                padding: 40px;
            }

            h1 {
                font-size: 3rem;
                margin-bottom: 10px;
            }

            p {
                color: #94a3b8;
                font-size: 1.1rem;
                line-height: 1.6;
            }

            .links {
                margin-top: 30px;
            }

            a {
                display: inline-block;
                margin: 10px;
                padding: 12px 20px;

                text-decoration: none;

                background: #2563eb;
                color: white;

                border-radius: 8px;

                transition: 0.2s;
            }

            a:hover {
                background: #1d4ed8;
            }

            code {
                color: #38bdf8;
            }
        </style>
    </head>

    <body>

        <div class="container">

            <p>
            
██╗███╗░░░███╗░█████╗░░██████╗░███████╗
██║████╗░████║██╔══██╗██╔════╝░██╔════╝
██║██╔████╔██║███████║██║░░██╗░█████╗░░
██║██║╚██╔╝██║██╔══██║██║░░╚██╗██╔══╝░░
██║██║░╚═╝░██║██║░░██║╚██████╔╝███████╗
╚═╝╚═╝░░░░░╚═╝╚═╝░░╚═╝░╚═════╝░╚══════╝
            </p>

            <p>
                AI-powered image orchestration backend built with
                Django REST Framework, FastAPI, and GPU inference pipelines.
            </p>

            <p>
                Available endpoints:
            </p>

            <div class="links">
                <a href="/api/docs/">Swagger Docs</a>
                <a href="/api/schema/">OpenAPI Schema</a>
                <a href="/admin/">Admin Panel</a>
            </div>

            <p style="margin-top:40px;">
                Status: <code>online</code>
            </p>

        </div>

    </body>
    </html>
    """

    return HttpResponse(html)


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/gallery/", include("gallery.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("", intro, name="intro"),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

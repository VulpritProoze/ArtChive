from decouple import config
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

# Debug flag - controls whether Swagger/Silk are exposed
DEBUG = config("DJANGO_DEBUG", default=False, cast=bool)

urlpatterns = [
    # Admin Dashboard (must be before admin.site.urls to avoid catch-all pattern)
    path("admin/admin-dashboard/", include("core.urls_dashboard")),
    # Admin
    path("admin/", admin.site.urls),
    # App endpoints
    path("api/core/", include("core.urls")),
    path("api/post/", include("post.urls")),
    path("api/collective/", include("collective.urls")),
    path("api/gallery/", include("gallery.urls")),
    path("api/avatar/", include("avatar.urls")),
    path("api/notifications/", include("notification.urls")),
    path("api/search/", include(("searchapp.urls", "search"), namespace="search")),
]

# Only expose Swagger/Silk in development (DEBUG=True)
if DEBUG:
    urlpatterns += [
        # API documentation
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path(
            "api/schema/swagger-ui/",
            SpectacularSwaggerView.as_view(url_name="schema"),
            name="swagger-ui",
        ),
        path(
            "api/schema/redoc/",
            SpectacularRedocView.as_view(url_name="schema"),
            name="redoc",
        ),
        # Silk profiling UI
        path("api/silk/", include("silk.urls", namespace="silk")),
    ]

    # Serve media & static files in development
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

from decouple import config
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

DEBUG = config('DJANGO_DEBUG', default=False, cast=bool)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/core/', include('core.urls'), name='core'),
    path('api/post/', include('post.urls'), name='post'),
    path('api/collective/', include('collective.urls'), name='collective'),
    path('api/gallery/', include('gallery.urls'), name='gallery'),
    path('api/avatar/', include('avatar.urls'), name='avatar'),
    path('api/notifications/', include('notification.urls'), name='notifications'),
]

# Always append static assets routes when DEBUG (placed near top for clarity)
if DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Only include spectacular (API docs) in debug mode
if DEBUG:
    from drf_spectacular.views import (
        SpectacularAPIView,
        SpectacularRedocView,
        SpectacularSwaggerView,
    )
    urlpatterns += [
        # Schema
        path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
        path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
        path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    ]

# Only include silk (profiling) and media serving in debug mode
if DEBUG:
    urlpatterns += [
        path('api/silk/', include('silk.urls', namespace='silk')),
    ]

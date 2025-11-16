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

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/core/', include('core.urls'), name='core'),
    path('api/post/', include('post.urls'), name='post'),
    path('api/collective/', include('collective.urls'), name='collective'),
    path('api/gallery/', include('gallery.urls'), name='gallery'),
    path('api/avatar/', include('avatar.urls'), name='avatar'),
    path('api/notifications/', include('notification.urls'), name='notifications'),
    # Schema
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if config('DJANGO_DEBUG'):
    urlpatterns += [
        path('api/silk/', include('silk.urls', namespace='silk')),
    ] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)  # serv media from media folder

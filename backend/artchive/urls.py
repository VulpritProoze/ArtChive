from django.contrib import admin
from django.urls import path, include
from decouple import config
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/account/', include('account.urls')),
    path('api/post/', include('post.urls')),
    path('api/collective/', include('collective.urls')),
    # Schema
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if config('DJANGO_DEBUG'):
    urlpatterns += [path('silk/', include('silk.urls', namespace='silk'))]
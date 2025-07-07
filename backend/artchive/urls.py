from django.contrib import admin
from django.urls import path, include
from decouple import config

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/account/', include('account.urls')),
    path('api/post/', include('post.urls')),
]

if config('DJANGO_DEBUG'):
    urlpatterns += [path('silk/', include('silk.urls', namespace='silk'))]
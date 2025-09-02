from django.urls import path
from .views import CollectiveDetailsView

urlpatterns = [
    path('list/', CollectiveDetailsView.as_view(), name='collective-list'),
]
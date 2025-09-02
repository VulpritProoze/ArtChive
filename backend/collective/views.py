from rest_framework.generics import ListAPIView
from .serializers import CollectiveSerializer
from .pagination import CollectiveDetailsPagination
from .models import Collective

class CollectiveDetailsView(ListAPIView):
    queryset = Collective.objects.all()
    serializer_class = CollectiveSerializer

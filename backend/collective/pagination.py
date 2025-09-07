from rest_framework.pagination import PageNumberPagination

class CollectiveDetailsPagination(PageNumberPagination):
    page_size = 10

class CollectivePostsPagination(PageNumberPagination):
    page_size = 5
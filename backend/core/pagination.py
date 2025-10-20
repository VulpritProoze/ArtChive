
from rest_framework.pagination import PageNumberPagination


class BrushDripsTransactionPagination(PageNumberPagination):
    page_size = 20  # Default number of transactions per page
    page_size_query_param = 'page_size'  # Allow client to set page size
    max_page_size = 100  # Maximum limit per page

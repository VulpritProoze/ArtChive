from rest_framework.pagination import PageNumberPagination


class GalleryPagination(PageNumberPagination):
    """
    Pagination class for Gallery endpoints with customizable page size.

    Query parameters:
    - page: Page number (default: 1)
    - page_size: Number of items per page (default: 10, max: 50)
    """
    page_size = 10  # Default number of galleries per page
    page_size_query_param = 'page_size'  # Allow client to customize page size via query param
    max_page_size = 50  # Maximum limit per page for security
    page_query_param = 'page'  # Page number query parameter name

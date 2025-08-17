from rest_framework.pagination import PageNumberPagination

class PostPagination(PageNumberPagination):
    page_size = 10  # Default number of posts per page
    page_size_query_param = 'page_size'  # Allows client to override page size
    max_page_size = 100  # Maximum limit per page
    
class CommentPagination(PageNumberPagination):
    page_size = 10  # Default number of comments per page
    page_size_query_param = 'page_size'  # Allow client to override
    max_page_size = 100  # Maximum limit
from rest_framework.pagination import PageNumberPagination

class PostPagination(PageNumberPagination):
    page_size = 5  # Default number of posts per page
    max_page_size = 100  # Maximum limit per page
    
class CommentPagination(PageNumberPagination):
    page_size = 10  # Default number of comments per page
    max_page_size = 100  # Maximum limit
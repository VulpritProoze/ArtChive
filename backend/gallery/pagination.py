from rest_framework.pagination import PageNumberPagination

class GalleryPagination(PageNumberPagination):
    page_size = 12
    max_page_size = 50

class GalleryItemPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100
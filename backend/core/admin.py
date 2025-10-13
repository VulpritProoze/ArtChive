from django.contrib import admin
from core.models import User, Artist, BrushDripWallet, BrushDripTransaction

admin.site.register(User)
admin.site.register(Artist)
admin.site.register(BrushDripWallet)
admin.site.register(BrushDripTransaction)
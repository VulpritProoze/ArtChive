from django.contrib import admin

from core.models import Artist, BrushDripTransaction, BrushDripWallet, User

admin.site.register(User)
admin.site.register(Artist)
admin.site.register(BrushDripWallet)
admin.site.register(BrushDripTransaction)

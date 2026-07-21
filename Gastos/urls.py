from django.urls import path
from . import views

urlpatterns = [
    path('', views.inicio, name='inicio'),
    # API que consume el frontend (js/storage.js)
    path('api/expenses', views.expenses_collection, name='expenses'),
    path('api/expenses/<str:expense_id>', views.expense_detail, name='expense-detail'),
    path('api/budgets', views.budgets_collection, name='budgets'),
    path('api/settings', views.settings_view, name='settings'),
]

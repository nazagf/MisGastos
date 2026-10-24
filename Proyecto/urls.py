from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views

from Gastos.auth import OwnerAuthenticationForm

urlpatterns = [
    path('login/', auth_views.LoginView.as_view(
        template_name='Gastos/login.html', authentication_form=OwnerAuthenticationForm,
    ), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('admin/', admin.site.urls),
    path('', include('Gastos.urls')),
]

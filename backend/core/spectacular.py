from drf_spectacular.extensions import OpenApiAuthenticationExtension

class CookieJWTAuthExtension(OpenApiAuthenticationExtension):
    target_class = 'core.authentication.CookieJWTAuthentication'
    name = 'cookieJWTAuth'
    
    def get_security_definition(self, auto_schema):
        return {
            'type': 'apiKey',
            'in': 'cookie',
            'name': 'access_token',
            'description': 'Cookie-based JWT authentication'
        }
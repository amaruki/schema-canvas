// Test Django model import functionality
const djangoCode = `
from django.db import models
from django.utils import timezone

class User(models.Model):
    """User account information"""
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'auth_user'

class Post(models.Model):
    """Blog post"""
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'blog_posts'
`;

console.log('Django Model Import Test');
console.log('=======================');
console.log('Test Django code:');
console.log(djangoCode);
console.log('\nYou can test this by:');
console.log('1. Opening http://localhost:3000');
console.log('2. Click "Import" button');
console.log('3. Select "Django Models" format');
console.log('4. Paste this code into the text area');
console.log('5. Click "Load Example" to see this sample');
console.log('6. Then click "Import Schema"');

// Expected results:
// - Two tables: auth_user and blog_posts
// - auth_user should have: id, username, email, first_name, last_name, is_active, created_at
// - blog_posts should have: id, title, content, author, published, created_at, updated_at
// - A relationship from blog_posts.author to auth_user.id
// - auth_user.username should be marked as unique
// - auth_user.email should be marked as unique
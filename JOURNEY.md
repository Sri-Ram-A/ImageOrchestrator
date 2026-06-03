# How to run everything locally
```bash
micromamba activate pytorch
# django-backend
python manage.py runserver
# redis-broker
podman start redis-cc
# celery-workers
celery -A backend worker --loglevel=info --pool=solo
# fastapi-service
python manage.py
# frontend
npm run dev
```

## User browser
→ Edge / CDN / DNS  
→ Next.js frontend  
→ Nginx reverse proxy  
→ Django API server  
→ Redis queue  
→ Celery workers  
→ MinIO object storage  
→ PostgreSQL metadata DB  
→ Prometheus + Grafana monitoring  

```bash
git rm -r --cached <folder-name>
```

## Authenticate and Login
- Google : https://medium.com/@michal.drozdze/django-rest-framework-jwt-authentication-social-login-login-with-google-8911332f1008
- https://dj-rest-auth.readthedocs.io/en/latest/guides/social-auth/
- https://dj-rest-auth.readthedocs.io/en/latest/guides/social-auth/#2-configure-django-settings


## Qdrant Cloud and Openvino
- https://qdrant.tech/documentation/cloud-quickstart/
- python -m pip install --upgrade-strategy eager "optimum-intel[openvino]"
- https://docs.openvino.ai/2024/notebooks/siglip-zero-shot-image-classification-with-output.html

micromamba activate pytorch  
python manage.py runserver
fastapi dev main.py --port 8080  
uvicorn main:app --port 8080 --reload  

## Frontend
npm install next-themes  
npx shadcn@latest add button drawer badge dialog input label textarea select
npm install date-fns
npx motion-primitives@latest add glow-effect text-morph

## Django-celery
- https://medium.com/@sunilnepali844/understanding-celery-in-django-a-beginners-guide-to-background-tasks-fd40cbe5aac5
- https://docs.celeryq.dev/en/stable/django/first-steps-with-django.html
```bash
## https://hub.docker.com/_/redis
podman run -d \
  --name redis-cc \
  -p 6379:6379 \
  -v redis_data:/data \
  redis
##   In case of podman
sudo nano /etc/containers/registries.conf
## Un-comment and write
unqualified-search-registries = ["docker.io", "quay.io"]
podman exec -it redis-cc redis-cli ping
```
```bash
## Podman tutorial
## List running containers:
podman ps
## List ALL containers (even stopped ones):
podman ps -a
## Check downloaded images:
podman images
## Stop the container:
podman stop redis-cc
## Start it again:
podman start redis-cc
## Delete the container:
## (You must stop it first, or use -f to force)
podman rm -f redis-cc
## Delete the image:
podman rmi redis
## See the logs:
podman logs -f redis-cc
## Check Resource Usage:
podman stats redis-cc
```
```bash
## From your Django project root, in a separate terminal:
celery -A backend worker --loglevel=info --concurrency=2

## For development with auto-reload on file changes:
pip install watchdog
celery -A backend worker --loglevel=info --pool=solo
```
Worker types:
Worker A (CPU heavy)
celery -A backend worker -Q image_processing --concurrency=2
Worker B (embedding heavy)
celery -A backend worker -Q embedding --concurrency=1

## Sign in with google
https://priyanshuguptaofficial.medium.com/implementing-google-sign-in-with-django-and-reactjs-nextjs-6d34f0534dbd

## Deploy
### Redis 
- Configure using Redis Cloud Free
### Postgres
- Using Aiven / NeonDB i selected
- https://medium.com/django-unleashed/complete-tutorial-set-up-postgresql-database-with-django-application-d9e789ffa384

Host Django //
Run Gunicorn //
Put Nginx in front
Enable HTTPS
Configure static/media serving
Configure Celery worker
Configure Celery beat (optional)
Configure logging
Configure backups
Configure object storage later
### Preparing Django
```bash
gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --access-logfile -
gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --workers 3 --access-logfile -
```
- But this will arise a problem where if you visit localhost:8000/admin the static files will not be served anymore therefore
- Because when DEBUG=False, Django no longer serves static files automatically.
- python manage.py collectstatic
Even after: collecting static files
Something still must: serve them to browsers.
- https://whitenoise.readthedocs.io/en/stable/

Creating Azure Virtual Machine for deploying backends
### FastAPI Backend
- https://huggingface.co/blog/HemanthSai7/deploy-applications-on-huggingface-spaces

```bash
# Check Which Repo You're In
git remote -v  
git submodule add \
https://huggingface.co/spaces/Sri-Ram-A/image-semantic-search \
image-semantic-search
# Username : Sri-Ram-A
# PAssword : Hugghing face Write acess token
```
- Made the folder structure proper 
How to execute?  
```bash
python
from huggingface_hub import snapshot_download
snapshot_download(
    repo_id="google/siglip-base-patch16-224",
    local_dir="./models/siglip"
)
# Move this models folder to image-semantic-search/backend/models
cd backend
python manage.py
```

### Backend
https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/
python  manage.py check --deploy

git pull
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic
systemctl restart gunicorn
micromamba install "urllib3<2.0.0"
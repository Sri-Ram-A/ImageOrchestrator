# User browser
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
# Authenticate and Login
- Google : https://medium.com/@michal.drozdze/django-rest-framework-jwt-authentication-social-login-login-with-google-8911332f1008
- https://dj-rest-auth.readthedocs.io/en/latest/guides/social-auth/
- https://dj-rest-auth.readthedocs.io/en/latest/guides/social-auth/#2-configure-django-settings


# Qdrant Cloud and Openvino
- https://qdrant.tech/documentation/cloud-quickstart/
- python -m pip install --upgrade-strategy eager "optimum-intel[openvino]"
- https://docs.openvino.ai/2024/notebooks/siglip-zero-shot-image-classification-with-output.html

micromamba activate pytorch  
python manage.py runserver
fastapi dev main.py --port 8080  
uvicorn main:app --port 8080 --reload  

# Frontend
npm install next-themes  
npx shadcn@latest add button drawer badge dialog input label textarea select
npm install date-fns
npx motion-primitives@latest add glow-effect text-morph
# Deploying on Azure
- Created VM with following details
  - Compute Infrastructure | Virtual Machines > Korea
  - VSCode : F1 > Type and select: Remote-SSH: Add New SSH Host...
  - Illuminate > Connect  > Edit Settings > Any IP
```bash
$ chmod 400 Illuminate_key.pem 
$ ssh -i /home/srirama/Documents/sr_proj/ImageOrchestrator/Illuminate_key.pem azureuser@20.194.8.107
Welcome to Ubuntu 24.04.4 LTS (GNU/Linux 6.17.0-1017-azure x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

 System information as of Wed Jun  3 10:48:50 UTC 2026

  System load:  0.83               Processes:             145
  Usage of /:   53.6% of 28.02GB   Users logged in:       0
  Memory usage: 4%                 IPv4 address for eth0: 10.0.0.4
  Swap usage:   0%

 * Strictly confined Kubernetes makes edge and IoT secure. Learn how MicroK8s
   just raised the bar for easy, resilient and secure K8s cluster deployment.

   https://ubuntu.com/engage/secure-kubernetes-at-the-edge

Expanded Security Maintenance for Applications is not enabled.

0 updates can be applied immediately.

3 additional security updates can be applied with ESM Apps.
Learn more about enabling ESM Apps service at https://ubuntu.com/esm
```

# To connect with azure vm
```bash
# Setting Up local ubuntu with Remote-SSH
chmod 400 /home/srirama/Documents/sr_proj/ImageOrchestrator/Illuminate_key.pem
ssh -i /home/srirama/Documents/sr_proj/ImageOrchestrator/Illuminate_key.pem username@20.194.8.107
```

# 1. Setting up in azure vm (Inside SSH)
```bash
git checkout cloud
git branch
# 2. Copy .env files from local to azure
# 3. Install python 
sudo apt update
sudo apt install python3 python3-pip python3-venv python3-full -y
python3 --version
pip3 --version
# Python 3.12.3
# pip 24.0 from /usr/lib/python3/dist-packages/pip (python 3.12)
# 4. Creating venv
python3 -m venv venv
source venv/bin/activate
#  5. Install requirements.txt
cd backend && pip3 install -r requirements.txt
cd service && pip3 install -r requirements.txt
```

# 2. Setting Up django backend
```bash
# 1. Static Files Handling
python3 manage.py makemigrations
No changes detected
python3 manage.py makemigrations gallery
# https://www.digitalocean.com/community/tutorials/how-to-set-up-django-with-postgres-nginx-and-gunicorn-on-ubuntu
sudo apt update
sudo apt install nginx curl
python manage.py createsuperuser
python manage.py collectstatic

# 2. Running using gunicorn server and use systemctl
gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --access-logfile -
sudo nano /etc/systemd/system/gunicorn.service
[Unit]
Description=gunicorn daemon
After=network.target

[Service]
User=azureuser
Group=www-data
WorkingDirectory=/home/azureuser/ImageOrchestrator/service/backend
ExecStart=/home/azureuser/ImageOrchestrator/venv/bin/gunicorn \
          --access-logfile - \
          --workers 3 \
          --bind unix:/run/gunicorn.sock \
          backend.wsgi:application

[Install]
WantedBy=multi-user.target
sudo systemctl start gunicorn
sudo systemctl enable gunicorn
Created symlink /etc/systemd/system/multi-user.target.wants/gunicorn.service → /etc/systemd/system/gunicorn.service.

# 3. Creating nginx reverse proxy
sudo nano /etc/nginx/sites-available/django_backend
server {
    listen 80;
    server_name 20.194.8.107.sslip.io ;

    # Serve Django static files directly via Nginx
    location /static/ {
        alias /home/azureuser/ImageOrchestrator/service/backend/staticfiles/;
    }

    # Pass everything else to the Gunicorn socket
    location / {
        include proxy_params;
        proxy_pass http://unix:/run/gunicorn.sock;
    }
}
chmod +x /home/azureuser
sudo ln -s /etc/nginx/sites-available/django_backend /etc/nginx/sites-enabled/
sudo nginx -t
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
sudo systemctl restart nginx
sudo systemctl status nginx
● nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/usr/lib/systemd/system/nginx.service; enabled; preset: enabled)
     Active: active (running) since Wed 2026-06-03 13:56:17 UTC; 8s ago
       Docs: man:nginx(8)
    Process: 11071 ExecStartPre=/usr/sbin/nginx -t -q -g daemon on; master_process on>
    Process: 11074 ExecStart=/usr/sbin/nginx -g daemon on; master_process on; (code=e>
   Main PID: 11075 (nginx)
      Tasks: 3 (limit: 9492)
     Memory: 2.5M (peak: 2.5M)
        CPU: 21ms
     CGroup: /system.slice/nginx.service
             ├─11075 "nginx: master process /usr/sbin/nginx -g daemon on; master_proc>
             ├─11076 "nginx: worker process"
             └─11077 "nginx: worker process"

Jun 03 13:56:17 Illuminate systemd[1]: Starting nginx.service - A high performance we>
Jun 03 13:56:17 Illuminate systemd[1]: Started nginx.service - A high performance web>

# Convert http to https
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d 20.194.8.107.sslip.io -v
nslookup iluminate-backend.duckdns.org

# To see live backend error logs (e.g., if code crashes or models fail):
sudo journalctl -u gunicorn.service -f

# To see incoming web requests hitting your Nginx server:
sudo tail -f /var/log/nginx/access.log
git pull origin cloud
sudo systemctl restart gunicorn
```


# 3.Setting Up FastAPI microservice
```bash
```

# Setting Up frontend in vercel
```tsx
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
// Do the following output
// Resolving deltas: 100% (60/60), done.
// * (HEAD detached at FETCH_HEAD)
//   master
// => Compressing and cleaning up git repository
// => Appending nvm source string to /home/azureuser/.bashrc
// => Appending bash_completion source string to /home/azureuser/.bashrc
// => Close and reopen your terminal to start using nvm or run the following to use it now:
// export NVM_DIR="$HOME/.nvm"
// [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
// [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
source ~/.bashrc
nvm install node
node --version
npm --version
// v26.3.0
// 11.16.0
cd frontend/
npm install
npm install -g vercel
vercel login // To visit dashboard
 To deploy to production (illuminate-phi.vercel.app), run `vercel --prod`
```

# Setting up celery 
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



# Not happy with django deploy
```bash
# Install Ansible if you haven't already
sudo apt install ansible -y
sudo apt install caddy -y
# Execute your entire explicit configuration
ansible-playbook deploy.yml
# Verify things are working
sudo systemctl status caddy
sudo systemctl status gunicorn
sudo systemctl status fastapi
sudo systemctl status celery
ls -l /home/azureuser/ImageOrchestrator/gunicorn.sock
# To check if domain is reachable
nslookup illuminate-backend.duckdns.org 
sudo journalctl -u caddy -f
sudo journalctl -u gunicorn -f
sudo journalctl -u fastapi -f
sudo journalctl -u celery -f
sudo systemctl restart gunicorn # If you get 400 Bad Request error
# Check combined Status
chmod +x status.sh
./status.sh
# Deatiled logs
sudo journalctl -u fastapi -n 200 --no-pager
```
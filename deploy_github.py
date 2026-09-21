import os
import subprocess
import urllib.request
import json
import time

repo_name = "jump-rope-game"

# 1. Get credentials
p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
out, _ = p.communicate('protocol=https\nhost=github.com\n')
token = dict(line.split('=', 1) for line in out.strip().splitlines() if '=' in line).get('password')

# 2. Check if repo exists, if not create it
check_req = urllib.request.Request(f'https://api.github.com/repos/apple595201908/{repo_name}', headers={
    'Authorization': f'Bearer {token}',
    'User-Agent': 'Python'
})
repo_exists = False
try:
    urllib.request.urlopen(check_req)
    repo_exists = True
    print(f"Repository {repo_name} already exists.")
except urllib.error.HTTPError as e:
    if e.code == 404:
        print(f"Creating repository {repo_name}...")
        create_data = json.dumps({
            "name": repo_name,
            "description": "經典跳繩小遊戲（自訂角色復刻版）",
            "private": False,
            "has_pages": True
        }).encode('utf-8')
        create_req = urllib.request.Request('https://api.github.com/user/repos', data=create_data, headers={
            'Authorization': f'Bearer {token}',
            'User-Agent': 'Python',
            'Content-Type': 'application/json'
        })
        res = urllib.request.urlopen(create_req)
        print("Repository created successfully:", json.loads(res.read()).get('html_url'))
    else:
        raise

# 3. Initialize git if not already initialized
subprocess.run(['git', 'init', '-b', 'main'], check=True)
subprocess.run(['git', 'config', 'user.name', 'apple595201908'], check=True)
subprocess.run(['git', 'config', 'user.email', '306828392+apple595201908@users.noreply.github.com'], check=True)

# Add all files
subprocess.run(['git', 'add', '.'], check=True)
subprocess.run(['git', 'commit', '-m', 'Initial commit: jump rope game with custom character'], check=False)

# Configure remote with token embedded or standard URL
remote_url = f"https://apple595201908:{token}@github.com/apple595201908/{repo_name}.git"
subprocess.run(['git', 'remote', 'remove', 'origin'], stderr=subprocess.DEVNULL)
subprocess.run(['git', 'remote', 'add', 'origin', remote_url], check=True)

# Push to main
print("Pushing to GitHub main branch...")
push_res = subprocess.run(['git', 'push', '-u', 'origin', 'main', '--force'], capture_output=True, text=True)
print("Push output:", push_res.stdout, push_res.stderr)

# Clean up remote url so token is not stored in git config
safe_remote = f"https://github.com/apple595201908/{repo_name}.git"
subprocess.run(['git', 'remote', 'set-url', 'origin', safe_remote], check=True)

# 4. Enable GitHub Pages
time.sleep(2)
print("Configuring GitHub Pages...")
pages_data = json.dumps({
    "source": {
        "branch": "main",
        "path": "/"
    }
}).encode('utf-8')
pages_req = urllib.request.Request(f'https://api.github.com/repos/apple595201908/{repo_name}/pages', data=pages_data, headers={
    'Authorization': f'Bearer {token}',
    'User-Agent': 'Python',
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json'
})

try:
    res = urllib.request.urlopen(pages_req)
    print("GitHub Pages enabled:", json.loads(res.read()).get('html_url'))
except urllib.error.HTTPError as e:
    err_body = e.read().decode('utf-8')
    print("Pages config response:", e.code, err_body)
    # Check current status
    get_req = urllib.request.Request(f'https://api.github.com/repos/apple595201908/{repo_name}/pages', headers={
        'Authorization': f'Bearer {token}',
        'User-Agent': 'Python'
    })
    try:
        res = urllib.request.urlopen(get_req)
        print("Existing Pages URL:", json.loads(res.read()).get('html_url'))
    except Exception as ex:
        print("Pages get error:", ex)

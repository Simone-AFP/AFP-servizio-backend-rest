## Come installare lazydocker

```VERSION=v0.20.0
curl -L -o lazydocker.tar.gz "https://github.com/jesseduffield/lazydocker/releases/download/${VERSION}/lazydocker_${VERSION#v}_Linux_x86_64.tar.gz"
tar -xzf lazydocker.tar.gz
sudo install lazydocker /usr/local/bin/lazydocker
rm lazydocker.tar.gz```
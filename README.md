## For simplicity, I have used EKS cluster with two nodes type t2-medium. Kubeadm can as well be used to run same setup

## prerequisite to use EKS cluster

- Must have AWS account

- Setup user and proper limited access to EKS, ECR, ALB, and EC2 instances

- Create a security credentials to run terminal command using AWS API from local machine

- Use AWS configure to setup security credentials on local machine 

- Setup ECR repository (I have used ECR for private repository, but anyone can use Dockergub private or public repository, the image is also available on dockerhub)

## quickly Create EKS cluster usng eksctl command

Download eksctl cli here https://eksctl.io/installation/

Download Kubectl here https://kubernetes.io/docs/tasks/tools/

##### create EKS cluster

- eksctl create cluster --name=gradell --region=us-east-1 --zones=us-east-1a,us-east-1b --without-nodegroup

Once the cluster has been created, the kubeconfig file will be updated automatically to access the cluster and run kubectl commands

###### Create EKS nodes with attach few policies
- eksctl create nodegroup --cluster=gradell \
 --region=us-east-1 --name=gradell-node --node-type=t2.medium \
 --nodes=2 --nodes-min=2 --nodes-max=2 --node-volume-size=50 \
--ssh-access --ssh-public-key=gradell --managed --asg-access \
--full-ecr-access --appmesh-access --alb-ingress-access

### Confirm Cluster creation and nodes

- eksctl get cluster

- eksctl get nodegroup --cluster gradell

## Check nodes

- kubectl get nodes -o wide

### Manual test the Image on local machine

cd into the repository, and run "docker build -t gradell:latest . "

- docker run -dp:3000:3000 --rm --name test-app --env-file=.env gradell:latest

### Deploy Image to EKS cluster

First, tag the image to ECR image URl or public image URl on dockerhub

- docker tag gradell:latest jmcglobal/gradell-test:latest "use your own image url"

## Create a secret resource on kubernetes default namespace

Create a secret resource on default name space, encode every value to base64 format, either using cli or third party tool

```
apiVersion: v1
kind: Secret
metadata:
  name: gradell-secret
  namespace: default
type: Opaque
data:
  NODE_ENV: ""
  PORT: ""
  DATABASE: ""
  DATABASE_PASSWORD: ""
  JWT_SECRET: ""
```
save above secret config in a file .yml extension and run 

- kubectl apply -f secret.yml

#### Push docker image to repo

- docker push jmcglobal/gradell-test:latest

Update the image on deployment yaml file on container spec for the app

change directory to "kub-deployment"

- kubectl apply -f Deployment.yml

By default a pod will be created on default namespace, depending on requirements, namespace can be used to control access,security amd isolated environment for pods

## check the pod status and deployments

- kubectl get pod

- kubectl get deployment

With above command, you can confirm successfull creation of deployment which then create a pod with a single replica

![A7B265D3-479F-48C0-AD13-35C9680EA38C_4_5005_c](https://github.com/user-attachments/assets/21647203-94e6-4cc9-8874-5f9ab4e07483)


## Scaling the Pod to 5 replica count

- kubectl scale deployment gradell --replicas=5

### Check the pods again

- kubectl get pods 

### Five pods will be actively in running status

![EB618D57-1A90-4BBC-B8D5-91584561463D_4_5005_c](https://github.com/user-attachments/assets/c4f394ce-06c7-4433-bcba-f0e60af58a4a)


### CICD 

The CICD implementation is going to always run whenever a push event is made on the repository.

- A developer pushes the code,

- The CICD workflow on push event will trigger,

- On the action file, several steps will be run, which include;

  - Code checkout

  - Setup up requirement environment details and any tools that is defined

  - Authenticate to ECR on AWS account

  - build the docker image

  - After successfull build, push the image to repository

  - Update kubeconfig to grant access to run kubectl command on EKS

  - Update Image value on deployment file

  - Apply the deployment file 

  - wait for a few seconds to verify the status

- Done
  
### TLS/SSL implementation

- By default, the deployment service is not exposed to the internet, as it is running on ClusterIP mode. To expose the deployment service, you can either use NodePort service type or LoadBalancer. NodePort is not secure and not recommended to be used, only if it is necessary for testing only. To achieve SSL/TLS, loadbalancer is best option, using Ingress ALB and certificate Manager. AWS also has an ALB ingress method that can be integrated to ACM. 

### Deploy Ingress LoadBalancer, using helm chart

- helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx

Optional change from Deployment type to DaemonSet, so that it can be highly available across running nodes. It can be achieved by modifying the chart values

#### Update repo and deploy

- helm repo update

- kubectl create ns ingress-alb

- helm install -n <namespace> [RELEASE_NAME] ingress-nginx/ingress-nginx

- helm install -n ingress-alb ingress ingress-nginx/ingress-nginx 

## check installation

- kubectl get all -n ingress-alb

This command will get all resources on ingress-alb namespace, and the ingress service and pod will be running 

![4042EB93-E16C-443F-9607-9617EBFDC99E_4_5005_c](https://github.com/user-attachments/assets/c9dc459e-29e3-4500-8918-23ba0be2e8f2)

- NOTE: TLS/SSL required a valid registered domain name, for purpose of testing, I will use a test dns

#### Deploy Certificate Manager using helm chart

##### INSTALL CRDS FOR CERT-MANAGER

- kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.5/cert-manager.crds.yaml

## Add the Jetstack Helm repository
-  helm repo add jetstack https://charts.jetstack.io

- kubectl create ns cert-manager

- helm install cert-manager -n cert-manager --version v1.14.5 cert-manager/cert-manager

## verify installations by using helm list with namespace

- helm list -n cert-manager

## Deploy A cluster Isuer or namespace issuer that will generate and signed SSL 

Deploy namespace issuer

```
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: letsencrypt-nginx
  namespace: default
spec:
  acme:
    # Email address used for ACME registration
    email: mmadubugwuchibuife@gmail.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      # Name of a secret used to store the ACME account private key
      name: letsencrypt-gredell-private-key
    # Add a single challenge solver, HTTP01 using nginx
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### verify

- kubectl get issuer

![53108862-E280-4CA6-A2F4-925F94121B18_4_5005_c](https://github.com/user-attachments/assets/305a8b0d-9800-4294-9d65-7a891acac010)

### Deploy ingress resource with SSL/TLS (jmctech.xyz domain name)

```
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gradell-ingress
  labels:
    api: gradell
  namespace: default
  annotations:
    cert-manager.io/issuer: letsencrypt-nginx
spec:
  tls:
    - hosts:
      - test.jmctech.xyz
      secretName: letsencrypt-nginx-gradell
  ingressClassName: nginx
  rules:
    - host: test.jmctech.xyz
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: gradell-svc
                port:
                  number: 80
EOF
```
### Confirm certificates request (test.jmctech.xyz)

- kubectl get certificaterequest 

- kubectl get certificates

![996B3B48-4B32-44D5-B4C5-9751EC79D26C_4_5005_c](https://github.com/user-attachments/assets/3bb070a1-7643-45f9-a68c-5f0b51b13104)

- Access through https://test.jmctech.yml

#### Configure RBAC for restricted access

RBAC can be used to configure different access patterns (Read, Write, Delete)  on resources on kubernetes cluster, and specific to namespace and the whole cluster

And RBAC can be used to restrict pod access, by default every created pod uses a default service account on the namespace.

### Create RBAC clusterrole, role binding to allow get, list, watch, create, pod log, pod exec

```
cat <<EOF | kubectl apply -f - 
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["get", "create"]
EOF
```

### RoleBinding
```
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-reader
subjects:
- kind: User
  name: readUser
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io

Above have created a RBAC roles and the access privilege the user needs to have, to complete the access pattern ( A service account can be used, this is mostly used for a created resource) for a User access)

- Generate certificates for the user.

- Create a certificate signing request (CSR).

- Sign the certificate using the cluster certificate authority.

- Create a configuration specific to the user.

- Add RBAC rules for the user or their group.

The above will accomplished a highly secure access for users on the kubernets cluster, while service account can be used to secure resource access on the namespace

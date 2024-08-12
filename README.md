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

Create a secret resource on default name space

```
apiVersion: v1
kind: Secret
metadata:
  name: gradell-secret
  namespace: default
type: Opaque
data:
  NODE_ENV: ZGV2ZWxvcG1lbnQ=
  PORT: MzAwMA==
  DATABASE: bW9uZ29kYitzcnY6Ly9heW9vbGF2aWN0b3I0MTU6PHBhc3N3b3JkPkBjbHVzdGVyMC5hcnF3eS5tb25nb2RiLm5ldC8/cmV0cnlXcml0ZXM9dHJ1ZSZ3PW1ham9yaXR5JmFwcE5hbWU9Q2x1c3RlcjA=
  DATABASE_PASSWORD: VUtQTDRQWmpQSFBkSW5scg==
  JWT_SECRET: dGhpcy1pcy1hLXZlcnktc2VjdXJlZC1wYXNzd29yZHM=
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



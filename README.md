# Restate 1.2 Announcement Demos: Distributed Restate

This repository contains two demos showcasing distributed deployments with Restate. 
The first one demonstrates high availability, and the second one shows how to scale up from a single node to a cluster, and reconfigure clusters on the fly.

## Prerequisites
You need the following tools installed:
- Node.js and npm to run the TypeScript services used in this demo. 
- Docker and Docker Compose to run the Restate cluster.

## Demo 1: High Availability Demo

This demo shows how Restate can handle node failures and still be available for writes.
It also shows how the cluster recovers when the nodes are brought back up, maintaining consistency at all times.
Finally, it shows how the cluster stalls when there are not enough nodes available to maintain the replication factor.

### Pre-demo setup

Install the npm dependencies and start the service:
```shell
npm install && npm run app-dev
```

Go to the folder with the docker compose file for this demo and start the Restate cluster:
```shell
cd availability-demo
docker compose up
```

Register the service
```shell
restate deployments register http://host.docker.internal:9080
```
You can also do this via the UI at http://localhost:9070, if you don't have the CLI installed.

Start the three counter clients in three different terminal windows, to start sending requests:
```shell
npm run client
```
This client will try sending requests to node1 by default. If this node is down, it tries node2, and then node3.

```shell
npm run client2
```
This client will try sending requests to node2 by default. If this node is down, it tries node3, and then node1.
```shell
npm run client3
```
This client will try sending requests to node3 by default. If this node is down, it tries node1, and then node2.

**Note:** in a real-world scenario, you would have a load balancer in front of the nodes, and the clients would be configured to send requests to the load balancer.
For the sake of the demo, to show clearly which node is down, we are using the clients to send requests to specific nodes.

### Demo
Check the partitioning and leaders per partition:

```shell
docker compose exec node1 restatectl status
```
You can use `restatectl status` if you have `restatectl` installed locally.

Have a look at a partition that has node3 as the leader. 
We will now kill this node and see how the leader changes. 
The cluster maintains write availability, since the replication factor is 2, and there are still two nodes available.

```shell
docker compose kill node3
```

Check how the leaders changed for the partitions that before had node3 as leader:

```shell
docker compose exec node1 restatectl status
```

Restart the node:
```shell
docker compose restart node3
```

You will see that the node becomes available again and gets added to the cluster. 

Now kill two nodes and to see how the cluster stalls when we lose write availability (# nodes < replication factor):

```shell
docker compose kill node2
docker compose kill node3
```

Bring back the nodes, and see how the cluster recovers and starts processing again:

```shell
docker compose restart node2
docker compose restart node3
```

## Demo 2: Scale up from one node to a cluster

This demo shows how to scale up a Restate deployment from a single node to a cluster, and how to reconfigure the cluster on the fly.

### Pre-demo setup

Install the npm dependencies and start the service:
```shell
npm install && npm run app-dev
```

Go to the folder with the docker compose file for this demo and start the first node of the Restate cluster:

```shell
cd scale-demo
docker compose up -d node1
```

Register the service
```shell
restate deployments register http://host.docker.internal:9080
```
You can also do this via the UI at http://localhost:9070, if you don't have the CLI installed.

Start the counter client in a different terminal window, to start sending requests:
```shell
npm run client
```

### Demo

Show the status:
```shell
docker compose exec node1 restatectl status
```
You can use `restatectl status` if you have `restatectl` installed locally.

Spin up the other nodes:

```shell
docker compose up -d node2
```

```shell
docker compose up -d node3
```

Reconfigure the cluster to have log replication set to 2:
```shell
docker compose exec node1 restatectl config set --log-replication 2
```

Show that these new nodes joined the cluster:
```shell
docker compose exec node1 restatectl status
```
Rerun until applied-lsn is the same, or 1 less, for all nodes.


Then kill node1:
```shell
docker compose kill node1
```

Show that the cluster is still available and that the leaders have changed:
```shell
docker compose exec node2 restatectl status
```
Note that this command is pointed at node2, since node1 is down.


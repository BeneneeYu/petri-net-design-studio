# Petri Net Design Studio (PeNDeS)

Main Goal: Create a design studio to work with **Petri-Nets**.

# Domain

A Petri net, also known as a place/transition (PT) net, is **one of several mathematical modeling languages for the description of distributed systems**. It is a class of discrete event dynamic system. A Petri net is a directed bipartite graph that has two types of elements, places and transitions. [Wikipedia](https://en.wikipedia.org/wiki/Petri_net#:~:text=A Petri net%2C also known,of elements%2C places and transitions.)

To learn more complete definitions, read the **resource** part appended to this file.

# Installation

1. install [Docker-Desktop](https://www.docker.com/products/docker-desktop)
2. clone the repository
3. edit the '.env' file so that the BASE_DIR variable points to the main repository directory
4. `docker-compose up -d`
5. connect to your server at [http://localhost:8888](http://localhost:8888/)
6. Start developing

# How to start

After you enter the Design Studio, select `Create new project` and choose the `PetriNetProjectSeet` ready for you with examples including `DeadLock`, `WorkFlowNet`, `FreeChoiceNet` and `State Machine`, etc.

![create](https://user-images.githubusercontent.com/48000537/205842471-0ad475bf-47c5-4d6c-9d90-50f0adb4fa8a.png)

There comes the root. To create your own Petri Net, drag the `PetriNet` on the left side to the root box.

![root](https://user-images.githubusercontent.com/48000537/205842483-ef400a04-54a1-4db6-9c7b-7458d13446a0.png)

Double click the PetriNet, drag `Place` and `Transition` to the `PetriNet` box to start modeling PetriNet.

![net](https://user-images.githubusercontent.com/48000537/205842481-357841f6-0999-4898-9f53-7102826398ec.png)

This is a simple PetriNet.

![made](https://user-images.githubusercontent.com/48000537/205842476-6ac1bfda-f8fb-4295-8d6f-d7411c917fef.png)

We can set the `marking` attribute of `Place` by using the editor on the right side.

![marking](https://user-images.githubusercontent.com/48000537/205842479-8de13463-6f49-4979-b6d4-76baa1287ebc.png)



We can also use the classifier to classify what specific net that a Petri Net is.

![classifier](https://user-images.githubusercontent.com/48000537/205842470-aebac8b2-c383-4a81-98ff-231b1cc5a73f.png)

# Features

## Visualizer

Enabled transitions are differentiated by the green text and the blue filled color.

Marking of place is showed in the form of text in the middle of Place circle.

The direction of arrows shows how transitions are made.

### Fire Transitions

Click the `MyViz` tool on the left side to enter the visualizer. Click the `Fire` button to fire an enabled transition. **Firing** **happen** once the user **clicks on an enabled transition**

![myviz](https://user-images.githubusercontent.com/48000537/205842480-707038fa-53c5-4f7e-a7c0-20b1b12c5cb1.png)

Let's see an example of dead lock. Initially, the resource A and the resource B hold the locks. Two of the four transitions can be fired, which means Process A can get Lock B and Process B can get Lock A.

![deadLockInitial](https://user-images.githubusercontent.com/48000537/205842474-24b98e0d-cce8-43ff-aed2-efdc1afd8ab1.png)

Notice that the state of the simulation **should not be reflected in the model** (proceed separately).

### DeadLock

Let Process A can get Lock B and Process B can get Lock A, but we find that neither the Process A nor the Process B can continue because Process A holds Lock B and waits for Lock A, and Process B holds Lock A and waits for Lock B, which means the system meets a dead lock. Now, all the transitions are not enabled. There is a **notification** on the right down corner, and also a text line in the tool bar writes **'Meet the deadlock'**.

![deadlock](https://user-images.githubusercontent.com/48000537/205525288-e3f768a0-551b-46f2-b824-9601c688e94e.png)

### Reset simulator

But we can **reset** the net by clicking the button on the tool bar. The visualizer should have a **‘reset’ button** on its toolbar that switches the network **back to the initial marking**

![reset](https://user-images.githubusercontent.com/48000537/205842482-749fb387-48a3-47ab-bbac-7aa79c4ccdd9.png)



## Classifier

The interpreter(Classifier) is tied to a toolbar button to **check the individual classifications**.

![classifier](https://user-images.githubusercontent.com/48000537/205842470-aebac8b2-c383-4a81-98ff-231b1cc5a73f.png)

It can classify Marked Graph, State Machine, Free Choice Net and Workflow Net.

# Typical use-cases

## Dead Lock

In concurrent computing, deadlock is any situation in which no member of some group of entities can proceed because each waits for another member, including itself, to take action, such as sending a message or, more commonly, releasing a lock.


## Real-world: Repository producer and consumer

Let's assume that there is a repository, a producer line and a consumer line. The producer needs the repo lock and some space to produce a product and the consumer needs the repo lock and a product to consume a product. I use a PetriNet model to see this process.


This example can be abstracted into a producer/consumer problem.

# Work done

-  a **project seed** containing the **Petri Net metamodel**
-  **decoration** on the network
-  a **simulation visualizer** for behavior checking
-  an **interpreter** in the toolbar of the visualizer for classifications
-  example models
-  documentation

# Dev

## VisualizerControl

Initiate the data models of the visualizer, define what parts the visualizer is interested in, set appropriate event handlers for various events, control the data model. 

------

selectedObjectChanged: if currentNodeId and descriptor are string, update the territory with the visualizer's UI and patterns

eventCallback: get events, traverse them and judge the event type to see if it is in visualizer's territory, use different handlers to handle events

initialization work: 

ToolbarRelatedFunctions: set the toolbar, add/remove buttons

## VisualizerWidget

Draw the Graph & Paper(data model and view model of the widget), define view models(place, transition) of the visualizer, the way they update(condition, action), and how they look like.

------

jointjs: create diagrams, 

_el: the container

Graph & Paper: graph models are attached to paper views to present the diagram, we manipulate models, not views

elementView:  object that is responsible for rendering an element model into the paper.

confirmUpdate: receives all scheduled flags and based on them updates the view

initPlaces/Transitions: get all objects of a type in the webgme PetriNet model, traverse the objects, create a joint shape and bind it to every object(bijection)

fireTransition: for a transition (assert that it is enabled), get all source places and target places, create flowing tokens and update the marking of source/target places

## PetriNetClassifier

Define the classifier tool embeded in the visualizer toolbar, put all the active nodes in the model to right sets according to their type, establish mappings between places and transitions, classify what specific petri net it is according to judgement helper functions.

# Note

The implementation of making spots as markings in the middle of places require a good master of CSS. So I choose to show the number of marking in the form of text under any circumstances.

I use the github user content server to store my videos and pictures shown in this readme file. Feel free to contact me if the resources are no longer available.

Unfortunately, I am unfamiliar with Javascript. Some components are cited from open-source Sample projects. I make comment of the source link on the components I cite.

# Resource

- [creating ](https://docs.github.com/en/get-started/importing-your-projects-to-github/importing-source-code-to-github/adding-locally-hosted-code-to-github)your github respoitory if you start your work from a local directory
- [gmeconfig ](https://github.com/webgme/webgme/blob/master/config/README.md)options
- [design studio tutorial](https://webgme.readthedocs.io/en/latest/index.html) - parts might be outdated but speaks about a much more generic approach on how to assemble your design studio
- [webgme-cli ](https://github.com/webgme/webgme-cli)- some readme on the command line tool that allows for easy bootstrapping of webgme components
- docker based development [repository ](https://github.com/kecso/WDeStuP)

## PetriNet Definition

### places

### transitions

### arcs 

flow relation, is only between a place and a transition

f(p->t): an arc that connects transition t to place p

### marking

$M \in P \rightarrow Z^*$

a function that assigns a non-negative integer to every place and represents the state of the net

M(p): marking of place p

### inplaces

$^*t$: inplaces of a transition is a set of places where each element of a set is connected to the transition (place: src of arc, transition: dst of arc)

### outplaces

$t^*$: outplaces of a transition is a set of places that are connected to the transition (place: dst of arc, transition: src of arc)

### progress from one marking

- t ∈ T is enabled if ∀ p ∈ P | ∃ f(p→t) ∈ F M(p) > 0 - for all inplaces of the transition (that are connected to the transition via an incoming arc) the amount of tokens at the place is non zero
- *Firing* an enabled transition decreases the amount of *tokens* on all *inplaces* with one and increases the amount of token in all *outplaces* of the transition by one.

## PetriNet Classifications

### Free-choice petri net

if the intersection of the inplaces sets of two transitions are not empty, then the two transitions should be the same (or in short, each transition has its own unique set if inplaces )

### State machine

a petri net is a state machine if every transition has exactly one inplace
and one outplace .

### Marked graph

a petri net is a marked graph if every place has exactly one out transition
and one in transition.

### Workflow net

a petri net is a workflow net if it has exactly one source place `s` where `*s` = ∅, one sink place `o` where `o*` = ∅, and every x ∈ P ∪ T is on a path from s to o.


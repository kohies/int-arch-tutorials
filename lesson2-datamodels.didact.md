# Lesson 2: Data Models

In this lesson you are going to learn how to reduce redundancy and complexity by cleverly using data models.

## Retrieving records from a database

The Development Container you are connected to is running an instance of MongoDB in the back  ground.
This instance has a database called 'highPerformanceDb', which is what our high-performance application uses to store and retrieve data.
So far inside this database there is only one collection, named 'salesmen'.

You can look at the contents of the database by opening a new [terminal](didact://?commandId=vscode.didact.startTerminalWithName&text=MongoDB) and typing [mongo](didact://?commandId=vscode.didact.sendNamedTerminalAString&text=MongoDB$$mongo).
To list all databases in the connection type [show databases](didact://?commandId=vscode.didact.sendNamedTerminalAString&text=MongoDB$$show+databases).
To switch to our database type [use highPerformanceDb](didact://?commandId=vscode.didact.sendNamedTerminalAString&text=MongoDB$$use+highPerformanceDb). 
You can now list the collections by typing [show collections](didact://?commandId=vscode.didact.sendNamedTerminalAString&text=MongoDB$$show+collections).
List all salesmen in the collection by typing [db.salesmen.find().pretty()](didact://?commandId=vscode.didact.sendNamedTerminalAString&text=MongoDB$$db.salesmen.find().pretty()). The pretty command just formats the output, so we can read it better.

Our high-performance app provides an API endpoint to retrieve salesmen from the database and return them in JSON format.
Let's try it out by starting our app via the play button in the [Debug Panel](didact://?commandId=workbench.view.debug) or by clicking [here](didact://?commandId=workbench.action.debug.selectandstart) and selecting *Lesson 2: High Performance*.
You can now send an Http-Request to our app by opening [salesmen.http](didact://?commandId=vscode.open&projectFilePath=lesson2-datamodels/requests/salesmen.http) and clicking the little 'Send Request' button at the top.
A new window will open, that shows the Http-Response, with the JSON data for all salesmen in the database.
In [saveSalesman.http](didact://?commandId=vscode.open&projectFilePath=lesson2-datamodels/requests/saveSalesman.http) is another request with which you can add a salesman to the database. Try it out.

## Architectural Problem

Our application is structured the following way:

![communication](https://raw.githubusercontent.com/kohies/int-arch-tutorials/master/communication.svg)

The database on the right stores data in a defined shape, a schema.
It returns records in this shape and it expects new records to be sent in that shape.
For the database it is clear, that every salesman has a name, an id and a list of bonus salaries.

Our application on the other hand does not inherently know what the data in the database looks like.
Since we are dealing with a document oriented database here, we at least know, that we are dealing with objects.
We know that by requesting a salesman, we get a salesman object.
But that's about it.

Have a look at the [controller](didact://?commandId=vscode.open&projectFilePath=lesson2-datamodels/high-performance/modules/core/server/controllers/salesman.controller.ts) and the [service](didact://?commandId=vscode.open&projectFilePath=lesson2-datamodels/high-performance/modules/core/server/services/salesman.service.ts).
The service provides a method `getSalesmanById()`, which retrieves a specific salesman object from the database by using the *MongoDB Node.js Driver* and returns it.
The service does not really know what a salesman is.
In line 17 it just assumes that a salesman has a property named _id, by calling `collection('salesmen').findOne({ _id: salesmanId })` on the database.
**This is really bad.**
Keep in mind, that a service can contain complex business logic and that database records in document oriented databases can be nested.
We need some mechanism that guarantees us beforehand what a salesman object looks like.

It becomes even more obvious in line 31 of the [controller](didact://?commandId=vscode.open&projectFilePath=lesson2-datamodels/high-performance/modules/core/server/controllers/salesman.controller.ts):
``logger.info(`Retrieved salesman ${salesman['_id']} from database.`);``  
The Typescript compiler won't even let us use the *dot property accessor* `salesman._id` because it does not know wether salesman has this property.
Instead we are forced to use the *square bracket property accessor* `salesman['_id']`, because the existence of the property can only be determined at runtime.
Imagine having to refactor a property name in a codebase like this.

When saving new salesmen to the database we want to be able to use a constructor to create an object, which can then be sent to the database, instead of waiting for the database validation to tell us if the user input is well shaped.

## Architectural Change

We are going to connect to the database and model our application data by using *mongoose*.
Also we are combining our Mongoose models with Typescript interfaces. 
This way we can leverage the Typescript compiler by finding errors at compile time and using the auto complete function of our IDE.

### Mongoose and ts-mongoose

With mongoose we can connect to a MongoDB database, which we are already doing in [server.ts](didact://?commandId=vscode.open&projectFilePath=lesson2-datamodels/high-performance/server.ts) via [database.service.ts](didact://?commandId=vscode.open&projectFilePath=lesson2-datamodels/high-performance/modules/database/database.service.ts).
So there is nothing to do here.

We now need to create a schema for our salesman and derive a model from that schema.
This model can then be used to create new salesmen.

With mongoose we can create our schema and model like this:
```
import * as mongoose from 'mongoose';

const salesmanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  crmId: { type: String, required: true },
  hrmId: { type: String, required: true }
});

const Salesman = mongoose.model('Salesman', salesmanSchema);

const john = new Salesman({ name: 'John Miller', crmId: 'ABC', hrmId: '2' });

john.save();
```
But now we are not using static typing at all.
Our compiler has no idea, what john is (just that he is a mongoose document), so we can't call john.crmId for example.
In order to statically type our model, we would need something like this:
```
import * as mongoose from 'mongoose';

const salesmanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  crmId: { type: String, required: true },
  hrmId: { type: String, required: true }
});

interface SalesManProps extends mongoose.Document {
  name: string;
  crmId: string;
  hrmId: string;
}

const Salesman : mongoose.Model<SalesmanProps> = mongoose.model('Salesman', salesmanSchema);

const john : SalesmanProps = new Salesman({ name: 'John Miller', crmId: 'ABC', hrmId: '2' });

console.log(john.crmId);
john.save();
```
We have created a typescript interface that we pass as type argument to the generic type `mongoose.Model`.
Now our compiler knows, that john has the type `SalesmanProps`.

There is still one problem though: we now have duplicated all the properties of a salesman (once in the schema and once in the interface) and need to keep them in sync.

ts-mongoose offers a way to solve exactly that problem:
```
import {
  createSchema,
  Type,
  typedModel,
  ExtractDoc,
  ExtractProps,
} from "ts-mongoose";

export const SalesmanSchema = createSchema({
  _id: Type.objectId(),
  name: Type.string(),
  crmId: Type.string(),
  hrmId: Type.string(),
});

export const Salesman = typedModel("Salesman", SalesmanSchema);
export type SalesmanDoc = ExtractDoc<typeof SalesmanSchema>;
export type SalesmanProps = ExtractProps<typeof SalesmanSchema>;
```
We can now use `Salesman` (the model) to create and find salesman objects, `SalesmanDoc` as type for those objects, and `SalesmanProps` wherever we don't want the database related functions and properties of `SalesmanDoc` and just need the business logic part of salesman.
For example the controller shouldn't be able to interact with the database and should therefore only deal with objects of type `SalesmanProps` and never with objects of type `SalesmanDoc`.
The same is true for a frontend.

### Get Started!

You are now ready to go.
Start by opening [salesman.model.ts](didact://?commandId=vscode.open&projectFilePath=lesson2-datamodels/high-performance/modules/core/server/models/salesman.model.ts) and filling it.
Then modify the controller and the service to use the appropriate parts of that model.
Don't forget to also create a model for the bonus salaries and include it in the salesman model.
This can be done by including the following code in the schema creation: `bonuses: Type.array().of(BonusSchema)`.
You can see what the bonuses should look like in the database.

To test your code, [open a new terminal](didact://?commandId=vscode.didact.startTerminalWithName&text=Tests), change the directory to [high-performance](didact://?commandId=vscode.didact.sendNamedTerminalAString&text=Tests$$cd+lesson2-datamodels/high-performance) and type [npm test](didact://?commandId=vscode.didact.sendNamedTerminalAString&text=Tests$$npm+test).
You can also specify the file name of the test, if you just want to run single tests.
The tests in [salesman.service.test.ts](didact://?commandId=vscode.open&projectFilePath=lesson2-datamodels/high-performance/modules/core/tests/server/services/salesman.service.test.ts) and [salesman.controller.test.ts](didact://?commandId=vscode.open&projectFilePath=lesson2-datamodels/high-performance/modules/core/tests/server/controllers/salesman.controller.test.ts) are relevant for this lesson.
Feel free to change them to your liking.

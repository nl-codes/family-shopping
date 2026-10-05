const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
function load(file, overrides = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2017,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require: (name) => overrides[name] ?? require(name),
    Date,
  });
  return exports;
}
const { ItemModel } = load("models/index.ts");
const ItemRow = load("components/ItemRow.tsx").default;
const itemInput = load("lib/validation.ts").itemInput;
const id = "6ac0dbea1f8942ebf4ee1f67";
const actor = "6ac0dbdd1f8942ebf4ee1f66";

test("new items default to Pending and model permits only the three progress states", async () => {
  const item = new ItemModel({
    name: "Rice",
    quantity: "2 kg",
    listId: id,
    addedBy: actor,
  });
  assert.equal(item.status, "PENDING");
  for (const status of ["PENDING", "PARTIAL", "COMPLETED"]) {
    item.status = status;
    await item.validate();
  }
  item.status = "UNKNOWN";
  await assert.rejects(() => item.validate());
});

for (const status of ["PENDING", "PARTIAL", "COMPLETED"]) {
  test(`${status} renders correct checkbox and selected dropdown`, () => {
    const html = renderToStaticMarkup(
      React.createElement(ItemRow, {
        item: {
          name: "Rice",
          quantity: "2 kg",
          status,
          addedBy: { name: "Tester" },
          boughtBy: { name: "Tester" },
        },
        busy: false,
        onToggle() {},
        onStatusChange() {},
        onEdit() {},
        onDelete() {},
        onDuplicate() {},
      }),
    );
    assert.ok(html.includes(`aria-checked="${status === "COMPLETED"}"`));
    assert.ok(html.includes(`<option value="${status}" selected="">`));
  });
}

test("status API records completion attribution and clears it for Partial/Pending", async () => {
  let update;
  const route = load("app/api/items/[id]/route.ts", {
    "@/lib/api": {
      api: (work) => work(),
      id: require("zod").z.string(),
      requireRecord: async () => {},
      HttpError: Error,
    },
    "@/lib/validation": { itemInput },
    "@/lib/list-access": {
      sameOrigin() {},
      requireListAccess: async () => ({ isArchived: false }),
    },
    "@/models": {
      UserModel: {},
      ItemModel: {
        findById: async () => ({ listId: id }),
        findByIdAndUpdate: (_id, data) => {
          update = data;
          return { populate: async () => data };
        },
      },
    },
  });
  const context = { params: Promise.resolve({ id }) };
  for (const status of ["COMPLETED", "PARTIAL", "PENDING"]) {
    await route.PATCH(
      { json: async () => ({ status, actorId: actor }) },
      context,
    );
    assert.equal(update.status, status);
    assert.equal(update.boughtBy, status === "COMPLETED" ? actor : null);
    if (status === "COMPLETED") assert.ok(update.buyLocation instanceof Date);
    else assert.equal(update.buyLocation, null);
  }
  await assert.rejects(() =>
    route.PATCH(
      { json: async () => ({ status: "UNKNOWN", actorId: actor }) },
      context,
    ),
  );
  await assert.rejects(() =>
    route.PATCH({ json: async () => ({ status: "COMPLETED" }) }, context),
  );
});

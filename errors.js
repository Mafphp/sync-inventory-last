const queryNotFound = () => Object.assign(new Error('query not defined on this module'), {status: 404});
const commandNotFound = () => Object.assign(new Error('command not defined on this module'), {status: 404});
const invalidUser = () => Object.assign(new Error('Username or password is not valid'), {status: 403});
const noUser = () => Object.assign(new Error('User not found'), {status: 404});
const payloadIsNotDefined = () => Object.assign(new Error('payload is not defined'), {status: 406});
const inspection = {
  PhysicalCountThruQuery: () => Object.assign(TypeError('Cannot do physical count through inspecting query'), {status: 410}),
  DiffReasonMissing: () => Object.assign(new TypeError('diffReasons is missing in detailed inspection'), {status: 410}),
  InvalidInspectionWarehouse: () => Object.assign(new TypeError('invalid inspection warehouse'), {status: 410}),
  DiffReasonPhysical: warehouse => Object.assign(new TypeError('only logical diffReason is accepted, found: ' + warehouse), {status: 410}),
  NoWarehouseSpecified: () => Object.assign(new TypeError('warehouse should be specified for inspection'), {status: 410}),
  NoProductSpecified: () => Object.assign(new TypeError('product should be specified for inspection'), {status: 410}),
  PhysicalCountRequired: () => Object.assign(new TypeError('Cannot do inventory taking without physical count'), {status: 410}),
  LogicalCountRequired: () => Object.assign(new TypeError('Cannot do inventory taking without logical count'), {status: 410}),
  ChangeInLogicalCount: (userCount, sysCount) => Object.assign(new TypeError(`change in stock of warehouse from ${userCount} to ${sysCount}`), {status: 410}),
  ProductHasTransactions: () => Object.assign(new TypeError('Cannot register arbitrary physical count for product with transactions'), {status: 410}),
  DifferenceReportingIsNotPermitted: () => Object.assign(new TypeError('Difference reporting is not permitted'), {status: 410}),
  StockCannotBeCalculatedBeforeLoadingTransactions: () => Object.assign(new TypeError('Stock cannot be calculated before loading transactions'), {status: 410}),
  InventoryTakingNotPermittedForFuture: () => Object.assign(new ReferenceError('Inventory taking is not permitted for future'), {status: 410}),
  DifferenceReportingOnlyPermittedOnTheSameDay: () => Object.assign(new ReferenceError('Difference reporting permitted only on the same day'), {status: 410}),
  InconsistentSummation: () => Object.assign(new ReferenceError('Difference reasons do not satisfy the whole difference of logical and physical counts'), {status: 410}),
};

module.exports = {
  queryNotFound,
  commandNotFound,
  noUser,
  payloadIsNotDefined,
  invalidUser,
  inspection,
};
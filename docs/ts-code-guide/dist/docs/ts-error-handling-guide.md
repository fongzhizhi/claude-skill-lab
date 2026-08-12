---
updatedDate: 2026-08-12
---

# TypeScript 错误处理规范指南 v1.0

---

## 前言

错误处理是软件健壮性的基石。TypeScript 在 JavaScript 异常机制之上增加了类型系统，让我们能够在编译时捕获更多错误隐患。然而，类型系统无法解决运行时错误——如何捕获、分类、传播和记录错误，决定了应用在生产环境中的稳定性与可观测性。

本规范旨在建立一套统一的错误处理实践，覆盖异步错误、异常语义、边界校验三个核心维度。

**指导原则**：错误是值，不是事故。预期错误显式处理，非预期错误记录并上报，所有错误可追溯根因。

---

## 一、核心原则

### 1.1 错误处理的三个层次

```
预防（Prevention）→ 在编译时/入口处消除错误隐患
   ↓
恢复（Recovery）→ 捕获并优雅处理运行时错误
   ↓
兜底（Fallback）→ 全局捕获未处理的异常，体面退出
```

良好的错误处理围绕这三个方面展开：预防错误发生、在错误发生时优雅恢复、以及在最坏情况下体面退出。

### 1.2 错误处理的核心目标

1. **不让用户看到崩溃**：所有可预期的错误都有对应的处理路径
2. **不让错误静默消失**：每个被捕获的错误都要有记录
3. **不让根因丢失**：错误传播时保留完整的原始错误链
4. **不让调试变难**：错误信息包含足够的上下文（操作、输入、环境）

---

## 二、强制要求

### 2.1 异步错误必须处理

`await` 调用的 Promise 必须通过 `try/catch` 或 `.catch()` 处理，禁止未捕获的 Promise rejection。

```typescript
// ❌ 错误：未捕获的 Promise rejection
async function fetchUser(id: string) {
  const response = await fetch(`/api/user/${id}`);
  return response.json();
}

// ✅ 正确：使用 try/catch（假设 logger 已注入，详见 § 11）
async function fetchUser(id: string) {
  try {
    const response = await fetch(`/api/user/${id}`);
    return await response.json();
  } catch (error) {
    logger.error("Failed to fetch user", { id, error });
    throw new ServiceError("Failed to fetch user", "USER_FETCH_FAILED", {
      cause: error,
    });
  }
}

// ✅ 正确：使用 .catch()
fetchUser("123").catch((error) => {
  logger.error("Failed to fetch user", { error });
});
```

### 2.2 catch 中禁止静默吞错：使用 `catch (error: unknown)`

`catch` 块中必须至少记录日志，并包含错误上下文（操作、输入、原始错误信息）。**必须使用 `catch (error: unknown)`**，因为 TypeScript 4.0+ 中 catch 变量类型为 `unknown`，直接访问 `error.message` 会导致类型错误。

```typescript
// ❌ 错误：静默吞错
try {
  await processOrder(order);
} catch {
  // 什么都不做
}

// ❌ 错误：假设 error 是 Error 类型（TypeScript 4.0+ 报错）
try {
  await processOrder(order);
} catch (error) {
  console.log(error.message); // TS 报错：error 为 unknown
}

// ✅ 正确：使用 unknown + 类型收窄，记录完整上下文
try {
  await processOrder(order);
} catch (error: unknown) {
  logger.error("Order processing failed", {
    orderId: order.id,
    userId: order.userId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  throw error;
}
```

**配套类型守卫工具**（见 § 10.5）：

```typescript
function isError(value: unknown): value is Error {
  return value instanceof Error;
}
```

### 2.3 使用 throw 抛 Error 实例

禁止抛裸字符串、数字、对象字面量等非 `Error` 类型。

```typescript
// ❌ 错误：抛字符串
throw "Invalid user ID";

// ❌ 错误：抛对象字面量
throw { code: 404, message: "Not found" };

// ✅ 正确：抛 Error 实例
throw new Error("Invalid user ID");

// ✅ 正确：抛自定义错误类
throw new ValidationError("User ID cannot be empty");
```

**ESLint 配置**：

- 启用 `@typescript-eslint/only-throw-error`（TypeScript 项目推荐）
- 禁用 ESLint 核心的 `no-throw-literal`（避免规则冲突）

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    "no-throw-literal": "off",
    "@typescript-eslint/only-throw-error": "error",
  },
};
```

### 2.4 区分业务错误与系统错误

| 类型         | 特征                                 | 处理方式                             |
| ------------ | ------------------------------------ | ------------------------------------ |
| **业务错误** | 输入非法、状态冲突、权限不足         | 可预期，调用方可处理，返回明确错误码 |
| **系统错误** | 网络超时、数据库连接失败、文件不存在 | 不可预期，记录并上报，必要时重试     |

```typescript
// ✅ 业务错误：使用自定义业务错误类
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// ✅ 系统错误：记录详细上下文并上报
try {
  await db.query(sql);
} catch (error: unknown) {
  logger.error("Database query failed", {
    sql,
    params,
    error: error instanceof Error ? error.message : String(error),
  });
  metrics.increment("db.error");
  throw new SystemError("Database operation failed", { cause: error });
}
```

### 2.5 函数入口对不可信输入做边界校验

对参数合法性、空值、超长、越界等进行校验，非法输入快速失败并给出可读错误信息。

```typescript
// ❌ 错误：直接使用未校验的输入
function getUserAge(userId: number) {
  // userId 可能为负数、NaN、超出范围
  return users[userId].age; // 可能崩溃
}

// ✅ 正确：入口处校验
function getUserAge(userId: number): number {
  if (!Number.isInteger(userId) || userId < 0) {
    throw new ValidationError(
      "userId must be a positive integer",
      "userId",
      userId,
    );
  }
  if (userId >= users.length) {
    throw new ValidationError(
      `userId ${userId} out of range`,
      "userId",
      userId,
    );
  }
  return users[userId].age;
}
```

### 2.6 错误传播保持原始错误链

包装异常时使用 `cause` 属性保留原始错误引用，不丢失根因。

> **兼容性提示**：`Error` 构造函数的 `cause` 选项属于 ES2022 特性，需要 Node.js ≥ 16.9.0 或现代浏览器。若环境不支持，可降级为手动赋值 `error.cause = originalError`。

```typescript
// ❌ 错误：丢失原始错误
try {
  await apiCall();
} catch (error) {
  throw new Error("API call failed"); // 原始 error 丢失
}

// ✅ 正确：使用 cause 保留原始错误（ES2022+）
try {
  await apiCall();
} catch (error) {
  throw new Error("API call failed", { cause: error });
}

// ✅ 正确：降级方案（兼容低版本环境）
try {
  await apiCall();
} catch (error) {
  const wrapped = new Error("API call failed");
  wrapped.cause = error; // 手动赋值
  throw wrapped;
}

// ✅ 正确：自定义错误类支持 cause
class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ServiceError";
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}

try {
  await apiCall();
} catch (error) {
  throw new ServiceError("API call failed", "API_ERROR", { cause: error });
}
```

---

## 三、禁止行为（负面模式清单）

以下行为被严格禁止，每项均附原因说明：

| 禁止行为                                | 为什么是错的                                                              | 正确做法                                                            |
| --------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 空 `catch {}`                           | 错误被完全抹除，线上问题排查时如同大海捞针                                | 至少记录日志，包含错误上下文                                        |
| 用 `console.log` 代替错误日志           | 无法结构化采集、无法分级、生产环境通常不输出                              | 统一走项目日志体系；无日志体系时至少用 `console.error`              |
| 在循环内 catch 后继续忽略错误           | 错误累积后难以定位根因，可能导致数据不一致                                | 记录错误并决定中断循环或跳过，保留上下文                            |
| 抛非 `Error` 类型                       | 丢失堆栈信息，`instanceof` 失效，统一处理困难                             | 抛 `Error` 或自定义错误类                                           |
| 在 catch 中假设 `error` 是 `Error` 类型 | TypeScript 4.0+ 中 catch 变量类型为 `unknown`，直接访问 `.message` 会报错 | 先用 `error instanceof Error` 或 `isError` 工具收窄类型             |
| `@ts-ignore` 忽略类型错误               | 掩盖真实问题，后续 TypeScript 升级可能暴露                                | 使用 `@ts-expect-error` + 原因说明（见《TypeScript 注释规范指南》） |

---

## 四、自定义错误类

### 4.1 基础自定义错误类

TypeScript 中继承 `Error` 的建议做法：

```typescript
class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomError";
    // 为兼容性考虑（ES5 / 跨 realm 场景），建议保留
    // 若编译目标为 ES2015+ 且仅在单一 realm 运行，可省略
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}
```

**何时需要 `Object.setPrototypeOf`**：

| 编译目标                  | 是否必需 | 说明                                              |
| ------------------------- | -------- | ------------------------------------------------- |
| ES5                       | ✅ 必需  | TypeScript 输出为函数式继承，原型链不自动指向子类 |
| ES2015+（单一 realm）     | ⚠️ 可选  | 多数环境 `instanceof` 已能正常工作，但保留更安全  |
| 跨 realm（iframe/worker） | ✅ 必需  | 不同 realm 的 `Error` 构造函数不同，必须显式修复  |

**建议**：统一保留 `Object.setPrototypeOf(this, CustomError.prototype)`，确保所有场景下的兼容性。

### 4.2 带扩展属性的错误类

```typescript
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly query?: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "DatabaseError";
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

// 使用 + 类型收窄
try {
  await saveUser(data);
} catch (error: unknown) {
  if (error instanceof ValidationError) {
    // error.field 和 error.value 可用
    return { ok: false, field: error.field, message: error.message };
  }
  if (error instanceof DatabaseError) {
    // error.code 和 error.query 可用
    logger.error("DB error", { code: error.code, query: error.query });
  }
  throw error; // 未知错误继续上抛
}
```

### 4.3 错误层级结构（推荐）

建立领域错误层级，便于分类处理：

```typescript
// 基础错误
abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
    // 使用 new.target 确保子类正确继承原型链
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// 业务错误（4xx）
class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly statusCode = 400;

  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
  readonly statusCode = 404;

  constructor(
    resource: string,
    public readonly id?: string,
  ) {
    super(`${resource} not found${id ? `: ${id}` : ""}`);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

// 系统错误（5xx）
class SystemError extends AppError {
  readonly code = "SYSTEM_ERROR";
  readonly statusCode = 500;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    Object.setPrototypeOf(this, SystemError.prototype);
  }
}

// 服务层错误
class ServiceError extends AppError {
  readonly statusCode = 500;

  constructor(
    message: string,
    public readonly code: string = "SERVICE_ERROR",
    options?: { cause?: unknown },
  ) {
    super(message, options);
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}
```

### 4.4 错误码体系

采用字符串格式的错误码，无需维护映射表，日志更直观：

**格式**：`{领域}_{类别}_{具体原因}`

| 领域      | 类别         | 示例错误码                           |
| --------- | ------------ | ------------------------------------ |
| `USER`    | `VALIDATION` | `USER_VALIDATION_EMAIL_INVALID`      |
| `ORDER`   | `STATE`      | `ORDER_STATE_INVALID_TRANSITION`     |
| `PAYMENT` | `EXTERNAL`   | `PAYMENT_EXTERNAL_GATEWAY_TIMEOUT`   |
| `DB`      | `QUERY`      | `DB_QUERY_CONNECTION_POOL_EXHAUSTED` |

**常量定义**（错误类型大类）：

```typescript
// 这里定义的是“错误类型大类”，作为基础码
// 具体实例可在类中组合生成更细粒度的码（如 USER_VALIDATION_EMAIL_INVALID）
export const ErrorCodes = {
  // 校验
  VALIDATION: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // 资源
  NOT_FOUND: "RESOURCE_NOT_FOUND",
  ALREADY_EXISTS: "RESOURCE_ALREADY_EXISTS",

  // 权限
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // 系统
  DATABASE_ERROR: "DB_OPERATION_FAILED",
  EXTERNAL_API_ERROR: "EXTERNAL_SERVICE_ERROR",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// 实际使用时，可在错误类中组合完整错误码
class UserValidationError extends ValidationError {
  readonly code = "USER_VALIDATION_EMAIL_INVALID";
  // ...
}
```

---

## 五、错误分类与处理策略

### 5.1 错误分类矩阵

| 错误类别             | 示例                   | 是否可预期 | 是否可重试    | 处理策略                   |
| -------------------- | ---------------------- | ---------- | ------------- | -------------------------- |
| **输入校验**         | 字段缺失、格式错误     | ✅ 是      | ❌ 否         | 返回 400 + 明确错误信息    |
| **业务规则**         | 余额不足、状态冲突     | ✅ 是      | ❌ 否         | 返回 409/422 + 业务错误码  |
| **资源不存在**       | 用户不存在、订单已删除 | ✅ 是      | ❌ 否         | 返回 404 + 资源标识        |
| **权限不足**         | 未登录、无操作权限     | ✅ 是      | ❌ 否         | 返回 401/403               |
| **网络/IO 超时**     | 超时、连接断开         | ❌ 否      | ✅ 是（幂等） | 指数退避重试 + 记录 + 上报 |
| **网络/IO 不可恢复** | DNS 解析失败、拒绝连接 | ❌ 否      | ⚠️ 有限重试   | 记录 + 上报 + 返回 503     |
| **数据库连接池**     | 连接池耗尽、死锁       | ❌ 否      | ✅ 是（部分） | 重试 + 熔断 + 上报         |
| **代码缺陷**         | 空指针、类型错误       | ❌ 否      | ❌ 否         | 记录堆栈 + 上报 + 返回 500 |

### 5.2 错误处理决策流程

```
捕获到错误
    ├─ 是业务错误（ValidationError / NotFoundError 等）？
    │   └─ 是 → 返回结构化错误响应（含错误码、可读信息），不重试
    │
    ├─ 是系统错误（网络/DB 等）？
    │   ├─ 操作是否幂等且错误类型可恢复？→ 是 → 重试（指数退避）
    │   └─ 否 → 记录日志 + 上报监控 + 返回 503/500
    │
    └─ 未知错误 → 记录完整堆栈 + 上报 + 返回 500（不暴露内部信息）
```

---

## 六、边界校验规范

### 6.1 校验时机

在以下边界必须进行校验：

1. **函数入口**：对外暴露的公共函数
2. **API 入口**：HTTP 控制器、WebSocket 消息处理器
3. **数据存储边界**：写入数据库前的数据
4. **外部依赖边界**：第三方 API 响应、用户输入

### 6.2 校验内容

| 校验类型   | 检查内容                        | 失败处理             |
| ---------- | ------------------------------- | -------------------- |
| 类型校验   | 参数是否为预期类型              | `ValidationError`    |
| 空值校验   | `null` / `undefined` / 空字符串 | `ValidationError`    |
| 范围校验   | 数值是否在有效范围              | `ValidationError`    |
| 长度校验   | 字符串/数组长度是否超限         | `ValidationError`    |
| 格式校验   | 邮箱、手机号、ID 格式           | `ValidationError`    |
| 存在性校验 | 资源是否存在                    | `NotFoundError`      |
| 权限校验   | 当前用户是否有操作权限          | `AuthorizationError` |

### 6.3 使用 Zod 进行运行时校验（推荐）

```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

type User = z.infer<typeof UserSchema>;

function processUser(input: unknown): User {
  const result = UserSchema.safeParse(input);
  if (!result.success) {
    // 取第一个错误，避免产生冗长信息
    const firstError = result.error.errors[0];
    throw new ValidationError(
      firstError.message,
      firstError.path.join("."),
      input,
    );
  }
  return result.data;
}
```

### 6.4 进阶：使用 Branded Type 标记校验后的值

校验通过后，可使用 TypeScript 的 **branded type**（品牌化类型/透明类型）将值标记为"已验证"，避免后续重复校验：

```typescript
// 定义 Branded Type
type Validated<T, Brand extends string> = T & { __brand: Brand };

// 定义具体的 Brand 类型
type ValidatedUser = Validated<User, "ValidatedUser">;

// 校验函数返回 Branded 类型
function validateUser(input: unknown): ValidatedUser {
  const result = UserSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Invalid user data");
  }
  return result.data as ValidatedUser;
}

// 业务函数直接信任校验后的值
function processValidatedUser(user: ValidatedUser) {
  // 此处无需再次校验，类型系统已保证
  console.log(user.email);
}
```

---

## 七、异步错误处理

### 7.1 async/await + try/catch

```typescript
async function getOrderWithDetails(orderId: string) {
  try {
    const order = await fetchOrder(orderId);
    const items = await Promise.all(order.itemIds.map((id) => fetchItem(id)));
    return { ...order, items };
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      logger.warn("Order not found", { orderId });
      return null;
    }
    const formatted = formatError(error);
    logger.error("Failed to fetch order", { orderId, ...formatted });
    throw new ServiceError("Order fetch failed", "ORDER_FETCH_FAILED", {
      cause: error,
    });
  }
}

// 辅助工具函数
function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}
```

### 7.2 Promise.all 中的错误处理

```typescript
type Item = { id: string; name: string }; // 实际类型按需定义

// ❌ 错误：一个失败导致全部失败
const results = await Promise.all(items.map((id) => fetchItem(id)));

// ✅ 正确：使用 Promise.allSettled 分别处理
const results = await Promise.allSettled(items.map((id) => fetchItem(id)));
const successes = results
  .filter((r): r is PromiseFulfilledResult<Item> => r.status === "fulfilled")
  .map((r) => r.value);
const failures = results
  .filter((r): r is PromiseRejectedResult => r.status === "rejected")
  .map((r) => ({ reason: formatError(r.reason) }));

if (failures.length > 0) {
  logger.error("Some items failed to fetch", {
    failures,
    count: failures.length,
  });
  // 根据业务决定：继续使用成功部分，还是整体失败
}
```

### 7.3 重试机制

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {},
): Promise<T> {
  const { maxRetries = 3, delay = 1000, shouldRetry } = options;
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // 业务错误默认不重试
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      // 自定义重试判断
      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }
      if (i < maxRetries - 1) {
        logger.warn(`Retry ${i + 1}/${maxRetries}`, {
          error: formatError(error),
        });
        await new Promise((resolve) =>
          setTimeout(resolve, delay * Math.pow(2, i)),
        );
      }
    }
  }
  throw new ServiceError("Operation failed after retries", "RETRY_EXHAUSTED", {
    cause: lastError,
  });
}
```

---

## 八、错误传播与链式

### 8.1 使用 `cause` 链式传播（ES2022+）

```typescript
try {
  await saveToDatabase(data);
} catch (dbError) {
  // 包装时保留原始错误
  throw new SystemError("Failed to save data", { cause: dbError });
}

// 上层可以追溯完整链
try {
  await processOrder(order);
} catch (error: unknown) {
  if (error instanceof Error) {
    // 遍历 cause 链
    let current: Error | undefined = error;
    while (current) {
      console.log(current.message);
      current = current.cause instanceof Error ? current.cause : undefined;
    }
  }
}
```

### 8.2 错误转换层（分层架构）

在分层架构中，每层应将错误转换为该层语义的错误类型：

```
Controller 层 → 捕获 Service 错误 → 转换为 HTTP 响应
Service 层    → 捕获 Repository 错误 → 转换为业务错误
Repository 层 → 捕获数据库驱动错误 → 转换为数据访问错误
```

```typescript
// Repository 层
class UserRepository {
  async findById(id: string): Promise<User> {
    try {
      const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
      if (!result.rows[0]) {
        throw new NotFoundError("User", id);
      }
      return result.rows[0];
    } catch (error: unknown) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(
        "Failed to query user",
        "DB_QUERY_ERROR",
        "SELECT * FROM users WHERE id = $1",
        { cause: error },
      );
    }
  }
}

// Service 层
class UserService {
  async getUser(id: string): Promise<User> {
    try {
      return await this.repository.findById(id);
    } catch (error: unknown) {
      if (error instanceof NotFoundError) throw error;
      throw new ServiceError(
        "User service unavailable",
        "USER_SERVICE_UNAVAILABLE",
        { cause: error },
      );
    }
  }
}
```

---

## 九、全局兜底

### 9.1 Node.js 环境

监听未捕获的异常和未处理的 Promise rejection：

```typescript
// 未捕获的同步异常
process.on("uncaughtException", (error) => {
  logger.fatal("Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  // 清理资源（关闭数据库连接、文件句柄、刷新日志缓冲区等）
  cleanupResources();
  // 退出策略选择（见下方说明）
  process.exit(1);
});

// 未处理的 Promise rejection
process.on("unhandledRejection", (reason) => {
  logger.fatal("Unhandled rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  cleanupResources();
  process.exit(1);
});
```

**`cleanupResources()` 典型实现**：

```typescript
async function cleanupResources() {
  // 关闭数据库连接池
  await db.close();
  // 刷新日志缓冲区
  await logger.flush();
  // 关闭文件句柄
  // 释放其他外部资源
}
```

**退出策略选择**：

| 部署模式                                    | 推荐策略                      | 说明                                           |
| ------------------------------------------- | ----------------------------- | ---------------------------------------------- |
| 单进程应用（CLI 工具、简单微服务）          | `process.exit(1)`             | 由进程管理器（PM2、systemd）自动重启           |
| 集群/多进程环境（Kubernetes、Node cluster） | 仅标记 `process.exitCode = 1` | 让负载均衡摘除该节点，处理完存量请求后优雅退出 |

```typescript
// 集群环境下的退出策略
process.on("unhandledRejection", (reason) => {
  logger.fatal("Unhandled rejection", { reason });
  process.exitCode = 1; // 标记不健康，但不立即退出
  // 在健康检查中暴露此状态，由 K8s 摘除流量
});
```

### 9.2 浏览器环境

```typescript
// 全局未捕获异常
window.addEventListener("error", (event) => {
  logger.error("Uncaught error", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
  });
  reportToSentry(event.error);
});

// 未处理的 Promise rejection
window.addEventListener("unhandledrejection", (event) => {
  logger.error("Unhandled rejection", {
    reason:
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason),
  });
  reportToSentry(event.reason);
});
```

---

## 十、Result 类型（函数式错误处理）

### 10.1 概述

除异常抛出外，**Result 类型** 是另一种主流错误处理范式——错误作为返回值的一部分，在类型系统中可见，调用方**必须**处理。

### 10.2 何时使用异常 vs Result

| 场景                   | 推荐方式         | 理由                                 |
| ---------------------- | ---------------- | ------------------------------------ |
| **领域层/业务核心**    | Result 类型      | 错误成为签名的一部分，调用方无法忽略 |
| **基础设施层/IO 操作** | throw 异常       | 错误不可预期，由上层统一捕获         |
| **API 边界**           | 异常转 HTTP 响应 | 框架原生支持                         |
| **批量处理/管道**      | Result 类型      | 适合 `map`/`filter` 等函数式组合     |

### 10.3 Result 类型定义

```typescript
// 基础定义
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

// 工具函数
function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// 使用示例
function parseJson(input: string): Result<unknown, SyntaxError> {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (e) {
    return { ok: false, error: e as SyntaxError };
  }
}

// 调用方必须检查 ok
function handleJson(input: string) {
  const result = parseJson(input);
  if (result.ok) {
    console.log("Parsed:", result.value);
  } else {
    console.error("Parse error:", result.error.message);
  }
}
```

### 10.4 链式组合（使用 pipe 辅助函数）

```typescript
// map：转换成功值
function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (result.ok) {
    return { ok: true, value: fn(result.value) };
  }
  return result;
}

// flatMap：链式组合，返回新 Result
function flatMapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  if (result.ok) {
    return fn(result.value);
  }
  return result;
}

// pipe：从右向左组合多个操作
function pipe<T>(value: T): T {
  return value;
}

// 使用（无管道操作符，通过嵌套实现）
const result = parseJson('{"a":1}');
const finalResult = flatMapResult(
  mapResult(result, (data) => (data as { a: number }).a),
  (a) => (a > 0 ? ok(a) : err(new Error("Value must be positive"))),
);

// 或使用辅助 pipe 函数（需手写扩展，此处仅示意概念）
```

> **生产环境推荐**：使用成熟的库如 `neverthrow` 或 `fp-ts`，提供更完整的工具函数集。

### 10.5 通用类型守卫工具

```typescript
// 判断是否为 Error 实例
function isError(value: unknown): value is Error {
  return value instanceof Error;
}

// 判断 Result 是否为成功
function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

// 使用
if (isError(error)) {
  // error 类型为 Error
}
```

---

## 十一、日志规范

### 11.1 错误日志必须包含的字段

| 字段                   | 说明                             | 必填         |
| ---------------------- | -------------------------------- | ------------ |
| `level`                | 日志级别（error / warn / fatal） | ✅           |
| `message`              | 可读的错误描述                   | ✅           |
| `error`                | 错误信息（`error.message`）      | ✅           |
| `stack`                | 堆栈信息                         | 生产环境建议 |
| `operation`            | 正在执行的操作名称               | ✅           |
| `input`                | 操作输入（脱敏后）               | 推荐         |
| `userId` / `requestId` | 关联上下文                       | 推荐         |
| `code`                 | 错误码（业务/系统）              | 推荐         |

### 11.2 日志级别使用指南

| 级别    | 使用场景               | 示例                            |
| ------- | ---------------------- | ------------------------------- |
| `fatal` | 进程即将崩溃           | 未捕获异常、未处理 rejection    |
| `error` | 操作失败，需要人工介入 | 数据库连接失败、第三方 API 超时 |
| `warn`  | 操作降级，不影响主流程 | 缓存未命中、重试成功            |
| `info`  | 正常业务流程           | 用户登录、订单创建              |

### 11.3 敏感信息脱敏

日志中严禁记录密码、Token、身份证号等敏感信息。推荐使用脱敏工具函数：

```typescript
// 脱敏工具函数
const SENSITIVE_FIELDS = new Set([
  "password",
  "pwd",
  "secret",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "ssn",
  "idCard",
  "creditCard",
  "cvv",
]);

function sanitizeForLog(data: unknown): unknown {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLog(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeForLog(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// 使用
logger.error("Operation failed", {
  input: sanitizeForLog(input),
  userId: user.id,
});
```

### 11.4 错误去重与采样（高并发场景）

在高并发场景下，相同错误反复触发会导致日志洪水，增加存储和观测成本：

```typescript
// 简单实现：按错误消息 + 操作名进行采样（每 10 分钟允许记录一次）
const errorRateLimiter = new Map<
  string,
  { lastLogTime: number; count: number }
>();

function logErrorWithSampling(
  key: string,
  logFn: () => void,
  options: { intervalMs?: number; maxCount?: number } = {},
) {
  const { intervalMs = 600000, maxCount = 10 } = options; // 默认 10 分钟
  const now = Date.now();
  const entry = errorRateLimiter.get(key);

  if (!entry || now - entry.lastLogTime > intervalMs) {
    // 新周期：记录并重置计数
    errorRateLimiter.set(key, { lastLogTime: now, count: 1 });
    logFn();
  } else if (entry.count < maxCount) {
    // 周期内未达上限：记录
    entry.count++;
    logFn();
  }
  // 超过上限：仅更新指标计数，不写日志
  metrics.increment("error.sampled", { key });
}

// 使用
logErrorWithSampling(`db_error_${operation}`, () => {
  logger.error("Database operation failed", { operation, error: dbError });
});
```

> **建议**：配合监控系统（如 DataDog、Prometheus）记录错误指标，日志仅作为详细排障依据，不承担计数职能。

---

## 十二、错误监控与告警

### 12.1 关键指标

| 指标         | 说明                     | 告警阈值建议         |
| ------------ | ------------------------ | -------------------- |
| 错误率       | 每分钟错误数 / 总请求数  | > 5% 触发告警        |
| 错误码分布   | 各类错误码的占比         | `500` 类错误突增告警 |
| 未捕获异常数 | `uncaughtException` 计数 | > 0 立即告警         |
| 重试次数     | 重试操作的总次数         | 突增表示上游不稳定   |

### 12.2 与监控系统集成

```typescript
// Sentry 集成示例
import * as Sentry from "@sentry/node";

// 在全局兜底中上报
process.on("uncaughtException", (error) => {
  logger.fatal("Uncaught exception", { error: error.message });
  Sentry.captureException(error);
  process.exit(1);
});

// 在错误处理中间件中上报（Express 示例）
function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof AppError) {
    // 业务错误不上报 Sentry（避免噪音）
    return res
      .status(err.statusCode)
      .json({ code: err.code, message: err.message });
  }
  // 未知错误上报
  Sentry.captureException(err, {
    tags: { path: req.path, method: req.method },
    user: { id: req.user?.id },
  });
  res
    .status(500)
    .json({ code: "INTERNAL_ERROR", message: "Internal server error" });
}
```

---

## 十三、框架集成示例

### 13.1 Express

```typescript
import { Request, Response, NextFunction } from "express";

// 错误处理中间件
function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // 记录日志
  logger.error("Request error", {
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  // 业务错误
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      ...(err instanceof ValidationError && { field: err.field }),
    });
  }

  // 未知错误：不暴露内部信息
  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "Internal server error",
  });

  // 上报监控
  Sentry.captureException(err);
}

// 在路由中使用
app.get("/api/user/:id", async (req, res, next) => {
  try {
    const user = await userService.getUser(req.params.id);
    res.json(user);
  } catch (error) {
    next(error); // 交给 errorHandler
  }
});

app.use(errorHandler);
```

### 13.2 NestJS

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "Internal server error";

    if (exception instanceof AppError) {
      status = exception.statusCode;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }

    this.logger.error("Request failed", { path: request.url, code, message });

    response.status(status).json({ code, message });
  }
}

// 使用
@Controller("user")
export class UserController {
  @Get(":id")
  async getUser(@Param("id") id: string) {
    try {
      return await this.userService.getUser(id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }
}
```

### 13.3 Next.js API Routes

```typescript
// pages/api/user/[id].ts
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const { id } = req.query;
    if (typeof id !== "string") {
      throw new ValidationError("Invalid user ID", "id", id);
    }

    const user = await getUser(id);
    res.status(200).json(user);
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ code: error.code, message: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ code: error.code, message: error.message });
    }

    logger.error("API error", {
      path: "/api/user/[id]",
      error: error instanceof Error ? error.message : String(error),
    });

    res
      .status(500)
      .json({ code: "INTERNAL_ERROR", message: "Internal server error" });
  }
}
```

---

## 十四、代码审查清单

PR 审查时确认以下事项：

1. ✅ 所有 `await` 调用是否在 `try/catch` 或 `.catch()` 中？
2. ✅ `catch` 块是否使用了 `catch (error: unknown)` 并正确收窄类型？
3. ✅ `catch` 块是否记录了错误日志（含上下文）？是否有空 `catch`？
4. ✅ 是否使用了 `throw` 抛非 `Error` 类型？
5. ✅ 自定义错误类是否正确继承了 `Error` 并修复了原型链（如需）？
6. ✅ 错误传播时是否保留了 `cause` 原始错误链？
7. ✅ 公共函数入口是否对不可信输入做了边界校验？
8. ✅ 业务错误与系统错误是否区分处理？
9. ✅ 错误日志是否包含足够的上下文（操作、输入、堆栈）？
10. ✅ 敏感信息（密码、token）是否在日志中脱敏？
11. ✅ 是否有 `@ts-expect-error` 未附加说明？
12. ✅ Result 类型场景下，调用方是否检查了 `ok` 字段？
13. ✅ 全局兜底（`uncaughtException` / `unhandledRejection`）是否配置？
14. ✅ `try/catch` 中是否通过 `finally` 或 `using`（ES2022 显式资源管理）正确释放了连接、文件句柄等资源？

---

## 十五、例外场景

在某些特定场景下，可以适度放宽规范要求：

| 场景                  | 可放宽项         | 理由                                                       |
| --------------------- | ---------------- | ---------------------------------------------------------- |
| **性能关键路径**      | 减少边界校验     | 如热路径函数，需权衡校验开销与健壮性，但应在文档中明确标注 |
| **原型代码/快速验证** | 简化错误处理     | 非生产代码，可仅记录 `console.error`                       |
| **内部工具函数**      | 可省略完整 JSDoc | 仅限同一模块内调用，调用方已知行为                         |

> 所有例外必须在代码中显式注释说明理由（参考《TypeScript 注释规范指南》中的 `// DESIGN:` / `// WARN:` 标签）。

---

## 版本历史

| 版本 | 日期       | 变更内容                                                              |
| ---- | ---------- | --------------------------------------------------------------------- |
| v1.0 | 2026-08-12 | 初始版本发布，覆盖异步错误、异常语义、边界校验、Result 类型、框架集成 |

---

> **错误处理不是锦上添花，而是生产环境的刚需。最好的错误处理是让错误不可能发生；次好的错误处理是让错误发生时能被清晰看到、快速定位、优雅恢复。**

_本文档将持续演进，欢迎通过反馈建议。_

---
updatedDate: 2026-08-12
---

# TypeScript 编码风格指南 v3.1

## 前言

代码是写给人看的，只是恰好能被机器执行。本指南的核心理念是：**约定 > 配置，自动化 > 人工约束**。所有规则必须能被 Lint 工具自动拦截，绝不依赖 Code Review 时的“记忆力”。

### 核心原则

1. **一致性优先**：风格选择本身不如一致性重要
2. **自动化兜底**：能用工具强制的一律不写进文档“建议”
3. **可读性至上**：代码的阅读时间远多于编写时间
4. **类型安全**：充分利用 TypeScript 类型系统，杜绝 `any` 逃生舱

## 一、命名规约（全量自动化覆盖）

### 1.1 总览

| 类别                 | 规范                              | 示例                                    | ESLint 自动拦截 |
| -------------------- | --------------------------------- | --------------------------------------- | --------------- |
| 变量/函数（未导出）  | `camelCase`                       | `userName`, `fetchUser`                 | ✅              |
| 类/接口/类型/枚举    | `PascalCase`                      | `UserAccount`, `UserInfo`               | ✅              |
| **枚举成员**         | **`PascalCase`（强制统一）**      | `Active`, `NotFound`                    | ✅              |
| 布尔变量             | `camelCase` + `is/has/can/should` | `isValid`, `hasPermission`              | ✅（顶层级）    |
| **导出基本类型常量** | **`CONSTANT_CASE`**               | `MAX_RETRIES`, `API_BASE_URL`           | ✅              |
| **导出引用类型常量** | **`camelCase`**                   | `defaultPagination`, `supportedLocales` | ✅              |
| 私有属性             | `camelCase`（无 `_` 前缀）        | `internalState`                         | ✅              |
| 文件/目录            | `kebab-case` + 点号修饰符         | `user-service.ts`, `user.service.ts`    | ⚠️（插件辅助）  |

### 1.2 ~ 1.6 （基础规约同 v2.0，此处略）

### 1.7 常量命名（自动化区分）

不再依赖人工记忆，通过 ESLint 的 `modifiers` 和 `types` 自动区分：

- **导出 + `const` + 基本类型（string/number/boolean）**：强制 `UPPER_CASE`
- **导出 + `const` + 引用类型（array/object/function）**：强制 `camelCase`
- **未导出的内部常量**：不强制（`camelCase` 或 `UPPER_CASE` 均可）

```typescript
// ✅ 基本类型 -> 自动拦截 UPPER_CASE
export const MAX_RETRIES = 3;
export const DEFAULT_TIMEOUT_MS = 5000;

// ✅ 引用类型 -> 自动拦截 camelCase
export const defaultPagination = { page: 1, size: 20 };
export const supportedLocales = ["en", "zh"] as const;

// ✅ 内部常量 -> 宽松处理
const localConfig = { theme: "dark" };
const INTERNAL_FLAG = true;
```

### 1.8 枚举成员（强制 Lint）

```typescript
// ✅ 好：全部 PascalCase
enum HttpStatus {
  Ok = 200,
  NotFound = 404,
}

// ❌ 坏：Lint 直接报错
enum HttpStatus {
  OK = 200,
  NOT_FOUND = 404,
}
```

**说明**：选择 `PascalCase` 而非 `UPPER_CASE` 是基于以下考虑：

- 字符串枚举成员本质上是**类型级别的标识符**，而非运行时字符串常量，风格应靠近类属性
- 数字枚举反向映射时，`HttpStatus.Ok` 比 `HttpStatus.OK` 更符合 JS 对象属性命名习惯
- 若团队历史代码已大量使用 `UPPER_CASE`，可通过 `overrides` 保留，但新项目建议统一

## 二、TypeScript 类型与结构规约

### 2.1 显式函数返回类型（必须）

```typescript
// ✅ 好
export function fetchUser(id: string): Promise<User> { ... }

// ❌ 坏：Lint 报错
export function fetchUser(id: string) { ... }

// ⚠️ 允许表达式省略（允许箭头函数简写）
const add = (a: number, b: number) => a + b; // 允许
```

### 2.2 接口与类型别名（明确场景）

| 场景                      | 推荐        | 理由                                             |
| ------------------------- | ----------- | ------------------------------------------------ |
| **React/Vue Props**       | `type`      | JSX 泛型推断历史兼容性更好，且可完美表达联合类型 |
| **对外暴露的 API 响应**   | `interface` | 可扩展性更强，便于版本演进                       |
| **可被继承的类契约**      | `interface` | 支持 `extends` 声明合并                          |
| **工具类型（Pick/Omit）** | `type`      | 映射类型只能用 `type`                            |
| **联合类型 / 元组**       | `type`      | `interface` 无法表达                             |

```typescript
// ✅ React Props 用 type
type ButtonProps = {
  variant: "primary" | "secondary";
  onClick: () => void;
};

// ✅ API 响应用 interface
interface ApiResponse<T> {
  code: number;
  data: T;
}

// ✅ 可扩展契约用 interface
interface Animal {
  name: string;
}
interface Dog extends Animal {
  breed: string;
}
```

### 2.3 禁止 `any` 逃生舱

```typescript
// ❌ 坏
const data: any = fetch();

// ✅ 好
const data: unknown = fetch();
if (isUserData(data)) { ... }
```

### 2.4 异步 Promise 误用检查

```typescript
// ❌ 坏：忘记 await
async function fetchData() {
  fetchFromApi(); // no-floating-promises 报错
}

// ✅ 好
async function fetchData() {
  await fetchFromApi();
}
```

### 2.5 桶文件（Barrel Files）使用规范

**不搞“一刀切禁止”，而是分级管控**：

| 层级                                            | 是否允许 `index.ts` | 说明                                                  |
| ----------------------------------------------- | ------------------- | ----------------------------------------------------- |
| **应用总入口** (`src/index.ts`)                 | ✅ 允许             | 仅导出公共 API                                        |
| **功能模块入口** (`features/user/index.ts`)     | ⚠️ **有条件允许**   | 仅聚合**类型定义**和**常量**，禁止聚合 Service 实现类 |
| **子目录内部** (`features/user/utils/index.ts`) | ❌ 禁止             | 内部引用直接使用具体文件路径                          |

```typescript
// ✅ 允许：features/user/index.ts 聚合类型
export type { User, UserRole } from "./user.types";
export { USER_STATUS } from "./user.constants";

// ❌ 禁止：聚合 Service 实现（会导致循环依赖难以追踪）
export { UserService } from "./user.service";
```

**配套措施**：启用 ESLint 的 `import/no-cycle` 检测真实循环依赖，而非依赖人为禁止聚合。

## 三、文件与目录命名（同 v2.0）

- 文件名：`kebab-case` + 可选点号修饰符（`.service.ts`, `.types.ts`, `.test.ts`）
- 目录：`kebab-case`

## 四、禁止魔法数字（同 v2.0）

业务含义明确的数字（除 `0, 1, -1` 及枚举外）必须提取为常量。

## 五、单文件单一职责

| 指标     | 目标     | 警告线       | ESLint 自动拦截          |
| -------- | -------- | ------------ | ------------------------ |
| 文件行数 | < 300 行 | ≥ 300 行拆分 | `max-lines`              |
| 函数行数 | < 30 行  | ≥ 50 行重构  | `max-lines-per-function` |

**特例（允许突破）**：仅限自动生成文件或第三方声明文件（`.d.ts`）。

## 六、代码格式（Prettier 硬配置）

团队根目录放置 `.prettierrc`：

```json
{
  "printWidth": 120,
  "tabWidth": 2,
  "singleQuote": true,
  "trailingComma": "all",
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

## 七、反模式

- **命名不一致**（`userData` 与 `get_user` 混用）
- **过度缩写**（`usr` 应为 `user`，公认缩写如 `id`/`url` 除外）
- **类型名重复**（`nameString` 应为 `name`）
- **`any` 泛滥**（用 `unknown` + 类型守卫替代）
- **未处理的 Promise**（必须 `await` 或 `void`）
- **滥用非空断言**（`user!.name` 应改为 `user?.name`）
- **导入顺序混乱**（第三方 > 绝对路径 > 相对路径）

## 八、工具链配置（v3.1 最终修正版）

### 8.1 ESLint 配置（修正所有规则冲突）

```javascript
// eslint.config.js
export default [
  {
    parserOptions: {
      project: true,
      tsconfigRootDir: __dirname,
    },
    rules: {
      // ==================== 命名规约（修正冲突） ====================
      "@typescript-eslint/naming-convention": [
        "error",
        // 【修正1】未导出的变量/函数：camelCase
        {
          selector: "variableLike",
          modifiers: ["unexported"],
          format: ["camelCase"],
        },

        // 【修正2】布尔变量（仅限顶层）强制前缀（函数参数中的布尔值可豁免）
        {
          selector: "variable",
          types: ["boolean"],
          format: ["camelCase"],
          prefix: ["is", "has", "can", "should"],
        },

        // 类/接口/类型/枚举：PascalCase
        { selector: "typeLike", format: ["PascalCase"] },

        // 接口禁止 I 前缀
        {
          selector: "interface",
          format: ["PascalCase"],
          custom: { regex: "^I[A-Z]", match: false },
        },

        // 枚举成员强制 PascalCase
        { selector: "enumMember", format: ["PascalCase"] },

        // 【修正3】导出基本类型常量 -> CONSTANT_CASE
        {
          selector: "variable",
          modifiers: ["exported", "const"],
          types: ["string", "number", "boolean"],
          format: ["UPPER_CASE"],
        },

        // 【修正4】导出引用类型常量 -> camelCase
        {
          selector: "variable",
          modifiers: ["exported", "const"],
          types: ["array", "object", "function"],
          format: ["camelCase"],
        },

        // 【兜底】已导出的其他变量：camelCase（非 const 的导出变量）
        {
          selector: "variable",
          modifiers: ["exported"],
          format: ["camelCase"],
        },
      ],

      // ==================== TypeScript 类型安全 ====================
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],

      // 【新增】显式函数返回类型（匹配 2.1）
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true, // 允许箭头函数简写
          allowTypedFunctionExpressions: true,
        },
      ],

      // 【新增】接口 vs type 约束（匹配 2.2）
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],

      // 异步 Promise 误用检查
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "warn",

      // ==================== 代码复杂度与行数 ====================
      "@typescript-eslint/no-magic-numbers": [
        "warn",
        {
          ignore: [0, 1, -1],
          ignoreEnums: true,
          ignoreReadonlyClassProperties: true,
        },
      ],
      "max-lines": [
        "warn",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "warn",
        { max: 50, skipBlankLines: true, skipComments: true },
      ],

      // ==================== 导入规范 ====================
      // 推荐使用 eslint-plugin-import 实现导入排序（比 Prettier 插件更稳定）
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-cycle": ["error", { maxDepth: 5 }],
    },
  },
];
```

### 8.2 关于 `tsconfig.eslint.json` 的特别说明

`@typescript-eslint` 的 `no-floating-promises` 等规则依赖类型检查。为确保 Lint 能覆盖所有文件（包括 `.test.ts`），建议在项目根目录创建 `tsconfig.eslint.json`：

```json
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*", "tests/**/*", "*.config.js", "*.config.ts"]
}
```

并在 ESLint 配置中指向该文件：

```javascript
parserOptions: {
  project: './tsconfig.eslint.json',
  tsconfigRootDir: __dirname,
}
```

### 8.3 CI 检查流水线

```bash
tsc --noEmit --pretty
eslint . --ext .ts,.tsx
prettier --check .
```

## 九、代码审查检查清单

**机器能拦截的不需要人工 Review**，以下清单仅保留**需要人类判断的设计层面**：

1. [ ] 函数/模块职责是否单一？是否超过行数阈值且非自动生成？
2. [ ] `interface` / `type` 的选择是否符合场景（Props/工具类型用 type，API/契约用 interface）？
3. [ ] 是否存在深度嵌套的 `index.ts` 聚合导致循环依赖风险？（`import/no-cycle` 已自动拦截，但设计层面仍需关注）
4. [ ] 业务常量是否已按领域拆分，而非堆叠在 `constants.ts` 中？
5. [ ] 导出的公共函数是否有显式返回类型？（Lint 已覆盖，但语义合理性需 Review）

> **v3.1 终章**：当 95% 的格式、命名、Promise 误用等问题在 `git commit` 时被自动拦截，团队便无需再为“代码长得不一致”消耗心智。这份指南的目标不是约束，而是将人类的认知资源从琐碎的格式博弈中解放出来，专注于真正的业务设计与架构演进。

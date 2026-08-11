---
updatedDate: 2026-08-11
---

# TypeScript 单元测试指南

> **核心理念**：测试即契约，锁定业务行为，而非绑定实现细节
> **阅读时长**：约 15 分钟
> **适用场景**：React/Vue 后台系统、中台页面、B/C 端交互应用


## 目录

1. [价值原点](#1-价值原点)
2. [测试策略模型](#2-测试策略模型)
3. [契约思维](#3-契约思维)
4. [代码分类与测试策略](#4-代码分类与测试策略)
5. [Mock 分层决策](#5-mock-分层决策)
6. [Vitest 实战技巧](#6-vitest-实战技巧)
7. [断言规则](#7-断言规则)
8. [质量门禁](#8-质量门禁)
9. [行动路线图](#9-行动路线图)


## 1. 价值原点

单元测试常被误解为“代码体检”——用来发现 Bug。但真相是：**测试用例完全基于当前代码编写，它无法发现那些还没被写出来的缺陷。**

单元测试真正的价值在于 **“防止回归”**——即锁定一份不可违背的业务契约，让未来的修改不敢越界。

- **有效测试的标志**：你预期它会失败，它确实曾失败过，修复后永久变绿。
- **无效测试的典型**：从写出来那天起就从未红过——大概率只测了代码恰好会走的那条路（注水测试）。

**核心结论**：测试覆盖率衡量的不是代码质量，而是你对“哪些行为不容破坏”的信心密度。


## 2. 测试策略模型

传统测试金字塔（大量单元 + 少量集成/E2E）在今天的前端已不是最优解。推荐 **“测试奖杯”（Testing Trophy）** 模型：

| 类型         | 占比 | 测什么                              | 说明                                    |
| :----------- | :--- | :---------------------------------- | :-------------------------------------- |
| **集成测试** | ~80% | 业务 Service / Store / 页面交互流程 | 不 Mock 内部依赖，只 Mock 网络/存储边界 |
| **单元测试** | ~15% | 工具函数、校验器、纯函数            | 表驱动穷举边界，性价比最高              |
| **E2E 测试** | ~5%  | 登录、下单、支付等 3~5 个核心旅程   | 仅覆盖最关键的用户路径                  |

**覆盖率目标**：行覆盖率 ≥ 80% 即可，**严禁追求 100%**（最后 20% 的边际成本是负收益）。重点关注 `branches`（分支覆盖率）而非 `lines`。

**特别说明**：如果资源只允许二选一，**交互密集型项目**（后台表单、可视化编辑器）优先保集成测试；**逻辑密集型项目**（SDK、算法库）优先保单元测试。策略适配永远比原则坚守更重要。


## 3. 契约思维

每个函数/模块都隐含一份契约——输入、输出、副作用、前置/后置条件。单元测试的本质，就是把这套契约**以机器可执行的形式固定下来**。

- **契约显式化**：不测试“代码写了什么”，而测试“业务承诺了什么”。
- **失败即收益**：一个从未失败的测试，就像从未生效的合同。
- **Bug 修复标准流程**：先写复现用例（红）→ 再修改源码（绿）→ 最后提交。该用例永久锁定场景，防止再犯。


## 4. 代码分类与测试策略

不同代码类型适用不同的“契约形态”：

| 代码类型                                     | 契约形式     | 具体策略                                                     |
| :------------------------------------------- | :----------- | :----------------------------------------------------------- |
| **纯函数（Utils/Helpers）**                  | 表驱动契约   | 使用 `test.each` 穷举等价类：正常值、边界值、异常值、空值    |
| **有状态类 / Store**                         | 状态机契约   | 测试状态流转路径（`idle → loading → success/error`）；断言最终**可读状态**，绝不触碰 `_private` 变量 |
| **副作用 / API 调用**                        | 黑盒行为契约 | Mock 网络边界，断言返回结果或 UI 变化（而非调用次数）        |
| **UI 组件交互**                              | 用户行为契约 | 使用 `@testing-library/user-event` 模拟真实点击/输入；**禁用快照**，改用 `getByRole` 断言关键节点 |
| **重依赖业务编排类**（如 `CheckoutService`） | 集成契约     | 不 Mock 内部函数，只 Mock 网络/存储边界；重构时内部逻辑可变，输入输出不变 |

**关于 UI 快照的明确结论**：
- `toMatchSnapshot()` 对大型组件是“注水重灾区”——DOM 微小变动就会让快照失效，Review 时无法区分功能变更还是样式微调。
- **替代方案**：只断言业务相关的关键节点，而非整棵 DOM 树。
  ```typescript
  // ❌ 禁止
  expect(container).toMatchSnapshot();
  // ✅ 正确
  expect(screen.getByRole('heading', { name: '订单详情' })).toBeInTheDocument();
  expect(screen.getByTestId('total-amount')).toHaveTextContent('¥1,000.00');
  ```


## 5. Mock 分层决策

在动手 Mock 之前，先区分三个概念：

- **Mock（行为模拟）**：`expect(fn).toHaveBeenCalled()` —— **脆弱**，重构调用方式会打断测试，尽量少用。
- **Stub（状态模拟）**：`vi.fn().mockReturnValue({ data })` —— 仅提供返回值，不关心是否被调用，**推荐**。
- **Fake（轻量实现）**：实现同一接口的内存版（如用 `Map` 替代 IndexedDB）—— **最推荐**，兼具速度和稳定性。

**决策四原则**：

1. **对外边界**（`fetch`、`axios`、`localStorage`、第三方 SDK）：**必须 Mock**。
2. **内部 Service / Utils**：**原则上不 Mock**，使用真实实例。若依赖复杂 IO（如 IndexedDB），优先构建 Fake 对象。
3. **被测模块自身**：**绝对禁止 Mock**（如 `vi.spyOn(module, 'methodToTest').mockReturnValue(...)`）。
4. **最终判定标准**：Mock 这个依赖后，测试是在验证“被调用了”还是“最终结果正确”？若是前者——弱断言，需重构；若是后者——可接受。


## 6. Vitest 实战技巧

日常开发掌握以下技巧即可覆盖绝大多数场景。

### 6.1 表驱动测试（测工具函数必备）

```typescript
describe('formatMoney', () => {
  test.each([
    [1000, '¥1,000.00'],
    [-1, '¥-1.00'],
    [0, '¥0.00'],
    [null, '--'],
    [undefined, '--'],
  ])('输入 %p 应输出 %p', (input, expected) => {
    expect(formatMoney(input)).toBe(expected);
  });
});
```

### 6.2 异步异常（区分同步/异步写法）

```typescript
// 同步函数抛错
expect(() => parseJSON('invalid')).toThrow('无效的JSON');

// 异步函数抛错 —— 必须用 .rejects，否则测试会挂起
await expect(fetchUser(-1)).rejects.toThrow('用户不存在');
```

### 6.3 时间锁定（解决 setTimeout/setInterval 不稳定）

```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});
afterEach(() => vi.useRealTimers());

it('3秒后自动跳转', () => {
  triggerRedirect();
  vi.advanceTimersByTime(3000);
  expect(mockRouter.push).toHaveBeenCalledWith('/home');
});
```

### 6.4 环境变量与随机数锁定（确保 CI 确定性）

```typescript
// 锁定随机数
vi.spyOn(Math, 'random').mockReturnValue(0.5);

// 锁定 uuid
vi.mock('uuid', () => ({ v4: vi.fn(() => 'fixed-uuid-1234') }));

// 环境变量在 vitest.config.ts 中统一设置
```

### 6.5 模块接缝（遗留系统特供）

**问题**：旧代码内部直接 `import { deepLogic } from '@internal/complex'`，测试时无法替换。

**解法**：利用 `vi.mock` 在测试文件顶部拦截该模块路径，无需修改源码也能替换实现。

```typescript
// 在测试文件顶部，所有 import 之前
vi.mock('@internal/complex', () => ({
  deepLogic: vi.fn(() => 'mocked result')
}));
```

### 6.6 Mock 保留其他导出（避免覆盖第三方库）

```typescript
vi.mock('@/lib', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, onlyMockThis: vi.fn() };
});
```


## 7. 断言规则

### 7.1 黄金法则：测结果，不测实现

| ❌ 脆弱断言（注水）                             | ✅ 稳健断言（有效）                                          |
| :--------------------------------------------- | :---------------------------------------------------------- |
| `expect(spyOn(fn)).toHaveBeenCalled()`         | `expect(result).toEqual(expectedOutput)`                    |
| `expect(component.state.isLoading).toBe(true)` | `expect(screen.getByText('加载中...')).toBeInTheDocument()` |
| `expect(store._internalFlag).toBe(true)`       | `expect(store.getData()).toEqual(mockData)`                 |

**检验标准**：如果重构代码内部逻辑（不改功能）会导致测试失败，则该测试是“实现测试”，必须重写。

### 7.2 对象断言（模糊匹配）

使用 `toMatchObject` + `expect.any()` 忽略时间戳、ID 等非核心字段：

```typescript
expect(result).toMatchObject({
  id: expect.any(Number),
  name: 'John',
  createdAt: expect.any(String)
});
```

### 7.3 副作用契约断言（业务可见粒度）

```typescript
// 状态变更
expect(store.getState().cart.items.length).toBe(1);
// 存储副作用
expect(localStorage.setItem).toHaveBeenCalledWith('cart', expect.stringContaining('productId'));
// 路由跳转
expect(mockRouter.push).toHaveBeenCalledWith('/success');
// DOM 变化
expect(screen.getByText('订单已提交')).toBeInTheDocument();
```


## 8. 质量门禁

### Code Review 红线（一票否决）

- [ ] 是否存在 `expect(true).toBe(true)` 或 `expect(value).toBeDefined()` 作为**唯一**断言？
- [ ] 是否 Mock 了**被测模块自身的方法**（如 `vi.spyOn(module, 'methodToTest').mockReturnValue(...)`）？
- [ ] 是否对大型组件（>10 行渲染代码）使用了 `toMatchSnapshot()`？
- [ ] 异步测试是否遗漏 `await` 或 `.rejects`？

### 常规检查

- [ ] 对象断言是否使用了 `toMatchObject` + `expect.any()`？
- [ ] 工具类是否使用 `test.each` 穷举边界？
- [ ] 时间依赖是否使用 `vi.useFakeTimers` 而非真实 `waitFor`？
- [ ] 环境熵值（时间/随机数/uuid）是否已锁定？
- [ ] `describe` 是否以业务场景命名？`describe('用户输入无效优惠码时', () => {})`


## 9. 行动路线图（从零补录）

别想着一次性全覆盖，按优先级分 3 步走：

1. **工具函数保底**：用表驱动把 `utils/` 里的纯函数补齐——性价比最高，半天能搞定。
2. **核心链路加固**：针对最复杂的 1~2 个业务 Store/Service，用集成测试覆盖核心流程，不 Mock 内部函数。
3. **Bug 驱动补录**：修 Bug 前，先写一个能复现该 Bug 的测试用例，从此永久锁定。

**最终心法**：当你重构完一段代码，发现测试一条都没改且全部通过时，你就真正理解单元测试了。


> **一句话记住这份指南**：测行为，不测实现；表驱动测工具，集成测流程；快照禁用，时间锁定；80% 覆盖，足矣。
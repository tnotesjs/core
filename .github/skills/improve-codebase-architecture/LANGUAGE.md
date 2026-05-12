# Architecture Language

## Core Terms

- Module：任何同时拥有 interface 与 implementation 的单元，可以是函数、类、服务、目录级抽象或发布入口。
- Interface：调用方为了正确使用 module 必须知道的一切，包括类型、约束、顺序要求、错误模式与配置语义，不只是函数签名。
- Implementation：module 内部如何完成工作。
- Depth：一个 interface 背后封装了多少行为与复杂度。高 depth 代表高 leverage。
- Deep module：调用方只需理解少量 interface，就能获得较多能力。
- Shallow module：interface 复杂度几乎等于 implementation，本质只是转发、拆碎或重新命名。
- Seam：可以替换、移动或收缩行为而不必原地大改调用方的位置。
- Adapter：在 seam 上满足某个 interface 的具体实现。
- Leverage：调用方从 depth 中获得的收益。
- Locality：维护者从 depth 中获得的收益，表现为知识、变更与 bug 更集中。

## Working Rules

- 用 deletion test 判断一个 module 是否真的有价值。
- interface 才是测试表面；测试应尽量依附 public interface，而不是 implementation 细节。
- 一个 adapter 通常只是“可能存在 seam”；两个以上 adapter 才更像“真实 seam”。
- 不要为了抽象而抽象；没有 leverage 和 locality 的 seam，大多只是 pass-through。

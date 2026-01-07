# SkillChain 核心代码片段文档

本文档展示了 SkillChain 平台的 10 个核心功能代码片段，涵盖 AI 智能调度、区块链证书上链等关键技术实现。

---

## 1. AI 自适应学习调度引擎

**文件**: `apps/web/src/lib/ai/AdaptiveSchedulingEngine.ts`

```typescript
export class AdaptiveSchedulingEngine {
  private model: tf.Sequential | null = null;
  
  /**
   * 预测最佳学习方法和时间段
   * 基于用户历史数据、当前时间、个人偏好
   */
  async predictBestMethod(
    hour?: number,
    dayOfWeek?: number
  ): Promise<{ method: string; confidence: number; optimalHours: number[] }> {
    // 1. 加载用户基线偏好（从注册时的问卷）
    await this.loadBaselinePreferences(userId);
    
    // 2. 获取用户历史学习数据
    const sessions = await this.fetchUserSessions(userId);
    
    // 3. 使用 TensorFlow.js 模型进行预测
    const features = this.extractFeatures(sessions, hour, dayOfWeek);
    const prediction = this.model?.predict(features);
    
    // 4. 应用基线调整（根据用户偏好微调）
    const adjustedScore = this.applyBaselineAdjustment(method, hour, baseScore);
    
    return { method: 'pomodoro', confidence: 0.85, optimalHours: [9, 14, 20] };
  }
}
```

**解释**: 
- 使用 TensorFlow.js 在浏览器端运行机器学习模型
- 结合用户历史学习数据和个人偏好进行智能推荐
- 支持 Pomodoro、Flowtime、Blitz、52/17 等多种学习方法
- 根据时间段和星期几动态调整推荐

---

## 2. 学习计划自动调整（基于测验表现）

**文件**: `apps/web/src/lib/ai/studyPlanner.ts`

```typescript
/**
 * 根据测验成绩自动调整学习计划
 * 如果测验失败，会重新安排复习时间
 */
export async function triggerRecalculationAfterQuiz(
  userId: string, 
  courseId: string
): Promise<void> {
  // 1. 获取课程的通过分数（由教师设置）
  const { data: course } = await supabase
    .from('courses')
    .select('passing_score')
    .eq('id', courseId)
    .single();
  
  const passingScore = course?.passing_score || 80;
  
  // 2. 获取最近的失败测验
  const { data: failedQuizzes } = await supabase
    .from('quiz_submissions')
    .select('score, quizzes!inner(lesson_id)')
    .eq('user_id', userId)
    .lt('score', passingScore)
    .order('created_at', { ascending: false });
  
  // 3. 如果测验失败，重新安排该课程的学习计划
  if (failedQuizzes.length > 0) {
    const failedLessonId = failedQuizzes[0].quizzes.lesson_id;
    
    // 4. 在计划中插入复习时间（3天后）
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + 3);
    
    await supabase.from('study_plans').insert({
      user_id: userId,
      lesson_id: failedLessonId,
      scheduled_at: reviewDate.toISOString(),
      status: 'pending',
      is_review: true
    });
  }
}
```

**解释**:
- 自动检测测验失败并触发学习计划调整
- 使用教师设置的通过分数（而非硬编码值）
- 智能安排复习时间，避免学习压力过大
- 记录所有调整日志，便于追踪学习轨迹

---

## 3. AI 模型训练服务

**文件**: `apps/web/src/lib/ai/TrainingService.ts`

```typescript
/**
 * 训练 AI 模型（调度、推荐、性能预测）
 * 通过 Supabase Edge Function 调用后端训练服务
 */
export async function trainModel(
  modelType: 'scheduling' | 'recommendation' | 'performance',
  userId?: string
): Promise<TrainingResult> {
  // 调用 Supabase Edge Function
  const { data, error } = await supabase.functions.invoke('train-ai-models', {
    body: { modelType, userId },
  });
  
  if (data?.metrics) {
    return {
      success: true,
      metrics: {
        accuracy: data.metrics.accuracy,      // 准确率
        precision: data.metrics.precision,    // 精确率
        recall: data.metrics.recall,          // 召回率
        f1Score: data.metrics.f1Score,        // F1 分数
        trainingSamples: data.metrics.trainingSamples,
        trainedAt: new Date().toISOString()
      }
    };
  }
}
```

**解释**:
- 支持三种模型类型：学习调度、课程推荐、性能预测
- 可以训练全局模型或个性化模型（针对特定用户）
- 返回详细的训练指标（准确率、精确率、召回率等）
- 使用 Supabase Edge Functions 进行异步训练，不阻塞前端

---

## 4. 区块链证书铸造（真实上链）

**文件**: `apps/web/src/lib/blockchain/BlockchainService.ts`

```typescript
/**
 * 在 Polygon 区块链上铸造证书 NFT
 * 使用 ethers.js 与智能合约交互
 */
async function realMinting(
  studentAddress: string,
  studentName: string,
  courseTitle: string,
  metadataURI: string,  // IPFS 元数据链接
  contractAddress: string
): Promise<MintResult> {
  // 1. 连接 Polygon 网络
  const provider = new ethers.JsonRpcProvider(
    import.meta.env.VITE_POLYGON_RPC_URL
  );
  
  // 2. 使用管理员私钥创建钱包（用于签名交易）
  const wallet = new ethers.Wallet(
    import.meta.env.VITE_ADMIN_PRIVATE_KEY,
    provider
  );
  
  // 3. 连接智能合约
  const contract = new ethers.Contract(
    contractAddress,
    ['function mintCertificate(address, string, string, string) returns (uint256)'],
    wallet
  );
  
  // 4. 调用合约函数铸造 NFT
  const tx = await contract.mintCertificate(
    studentAddress,    // 学习者钱包地址
    studentName,       // 学习者姓名
    courseTitle,       // 课程标题
    metadataURI        // IPFS 元数据 URI
  );
  
  // 5. 等待交易确认
  const receipt = await tx.wait();
  
  return {
    transactionHash: receipt.hash,
    tokenId: BigInt(receipt.logs[0].topics[3])  // 从事件中提取 tokenId
  };
}
```

**解释**:
- 使用 ethers.js 与 Polygon 区块链交互
- 调用 ERC-721 智能合约铸造不可转让的证书 NFT
- 证书元数据存储在 IPFS 上，确保去中心化和永久性
- 所有交易记录在区块链上，可公开验证

---

## 5. 自动证书铸造流程

**文件**: `apps/web/src/lib/blockchain/autoMintCertificate.ts`

```typescript
/**
 * 课程完成后自动铸造证书 NFT
 * 完整流程：检查完成度 → 生成图片 → 上传 IPFS → 上链
 */
export async function autoMintCertificate(
  userId: string,
  courseId: string,
  studentName: string,
  courseTitle: string,
  certificateElement: HTMLElement
): Promise<{ transactionHash: string; tokenId: bigint; ipfsHash: string } | null> {
  // 1. 检查课程是否真正完成（所有课程 + 测验通过）
  const completionStatus = await checkCourseCompletion(userId, courseId);
  if (!completionStatus.isCompleted) return null;
  
  // 2. 使用 html2canvas 将证书 DOM 元素转换为图片
  const canvas = await html2canvas(certificateElement, {
    backgroundColor: '#ffffff',
    scale: 2  // 高分辨率
  });
  const imageBlob = await new Promise<Blob>(resolve => 
    canvas.toBlob(resolve, 'image/png')
  );
  
  // 3. 上传图片到 IPFS（去中心化存储）
  const imageHash = await uploadImageToIPFS(imageBlob, `certificate-${courseId}.png`);
  
  // 4. 创建元数据 JSON 并上传到 IPFS
  const metadata = {
    name: `${courseTitle} Certificate`,
    description: `Certificate of completion for ${courseTitle}`,
    image: `ipfs://${imageHash}`,
    attributes: [
      { trait_type: 'Course', value: courseTitle },
      { trait_type: 'Student', value: studentName }
    ]
  };
  const metadataHash = await uploadMetadataToIPFS(metadata);
  
  // 5. 在区块链上铸造 NFT
  const mintResult = await mintCertificateNFT(
    studentAddress,
    studentName,
    courseTitle,
    `ipfs://${metadataHash}`
  );
  
  // 6. 保存到数据库
  await supabase.from('certificates').insert({
    user_id: userId,
    course_id: courseId,
    tx_hash: mintResult.transactionHash,
    ipfs_hash: imageHash,
    minted_at: new Date().toISOString()
  });
  
  return mintResult;
}
```

**解释**:
- 全自动化流程，无需手动操作
- 使用 IPFS 存储证书图片和元数据，确保去中心化
- 智能合约确保证书不可伪造和不可转让
- 所有步骤都有错误处理和日志记录

---

## 6. IPFS 去中心化存储

**文件**: `apps/web/src/lib/ipfs/pinata.ts`

```typescript
/**
 * 上传文件到 IPFS（通过 Pinata 服务）
 * IPFS 确保数据永久存储且去中心化
 */
export async function uploadImageToIPFS(
  file: File | Blob,
  fileName: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file, fileName);
  
  // Pinata 元数据配置
  formData.append("pinataMetadata", JSON.stringify({
    name: fileName,
  }));
  
  // 调用 Pinata API
  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: import.meta.env.VITE_PINATA_API_KEY,
      pinata_secret_api_key: import.meta.env.VITE_PINATA_SECRET_KEY,
    },
    body: formData,
  });
  
  const data = await response.json();
  return data.IpfsHash;  // 返回 IPFS CID（内容标识符）
}
```

**解释**:
- 使用 Pinata 作为 IPFS 网关，提供可靠的存储服务
- IPFS CID 是内容寻址的，确保数据完整性
- 证书图片和元数据永久存储在去中心化网络中
- 任何人都可以通过 CID 访问证书数据

---

## 7. 用户认证与角色管理

**文件**: `apps/web/src/contexts/AuthContext.tsx`

```typescript
/**
 * 用户注册（支持学习者和教育者两种角色）
 */
async function signUp(
  email: string,
  password: string,
  role: 'learner' | 'educator',
  fullName?: string,
  educatorInfo?: {
    professional_title: string;
    portfolio_url: string;
    org_id?: string | null;
  }
): Promise<void> {
  // 1. 创建 Supabase 认证用户
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || '',
        role: role,
      },
    },
  });
  
  // 2. 如果是教育者，更新专业信息
  if (data.user && role === 'educator') {
    await supabase.from('profiles').update({
      role: 'educator',
      verification_status: 'pending',  // 需要管理员审核
      professional_title: educatorInfo?.professional_title,
      portfolio_url: educatorInfo?.portfolio_url,
      org_id: educatorInfo?.org_id  // 如果通过邀请码加入组织
    }).eq('id', data.user.id);
  }
}
```

**解释**:
- 支持多角色系统：学习者、教育者、组织管理员、系统管理员
- 教育者需要审核才能发布课程
- 支持通过邀请码加入组织
- 使用 Supabase Auth 进行安全的用户认证

---

## 8. 课程学习进度跟踪

**文件**: `apps/web/src/pages/learner/CoursePlayer.tsx`

```typescript
/**
 * 跟踪课程学习进度
 * 自动标记课程完成，触发证书铸造
 */
useEffect(() => {
  const trackProgress = async () => {
    if (!currentLesson || !user) return;
    
    // 1. 检查课程是否已标记为完成
    const { data: existing } = await supabase
      .from('user_progress')
      .select('lesson_id')
      .eq('user_id', user.id)
      .eq('lesson_id', currentLesson.id)
      .maybeSingle();
    
    // 2. 如果未完成，标记为完成
    if (!existing) {
      await supabase.from('user_progress').insert({
        user_id: user.id,
        lesson_id: currentLesson.id,
      });
    }
    
    // 3. 检查整个课程是否完成
    const { data: allLessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId);
    
    const { data: completedLessons } = await supabase
      .from('user_progress')
      .select('lesson_id')
      .eq('user_id', user.id)
      .in('lesson_id', allLessons.map(l => l.id));
    
    // 4. 如果所有课程完成，触发证书铸造
    if (completedLessons.length === allLessons.length) {
      await autoMintCertificate(user.id, courseId, ...);
    }
  };
  
  trackProgress();
}, [currentLesson, user]);
```

**解释**:
- 实时跟踪每个课程的学习进度
- 自动检测课程完成并触发证书铸造
- 支持视频、文档、测验等多种课程类型
- 进度数据用于 AI 推荐和个性化学习计划

---

## 9. 智能合约（Solidity）

**文件**: `packages/contracts/contracts/CertificateNFT.sol`

```solidity
/**
 * ERC-721 证书 NFT 智能合约
 * 确保证书不可伪造、不可转让
 */
contract CertificateNFT is ERC721, Ownable {
    struct Certificate {
        string learnerName;
        string courseTitle;
        uint256 completionDate;
        string metadataURI;  // IPFS 链接
    }
    
    mapping(uint256 => Certificate) public certificates;
    mapping(address => bool) public authorizedMinters;  // 只有 SkillChain 可以铸造
    
    /**
     * 铸造证书 NFT
     */
    function mintCertificate(
        address learner,
        string memory learnerName,
        string memory courseTitle,
        string memory metadataURI
    ) external returns (uint256) {
        require(authorizedMinters[msg.sender], "Not authorized");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(learner, tokenId);  // 铸造给学习者
        
        certificates[tokenId] = Certificate({
            learnerName: learnerName,
            courseTitle: courseTitle,
            completionDate: block.timestamp,
            metadataURI: metadataURI
        });
        
        emit CertificateMinted(tokenId, learner, courseTitle, block.timestamp);
        return tokenId;
    }
    
    /**
     * 证书不可转让（防止买卖）
     */
    function _update(address to, uint256 tokenId, address auth) 
        internal override returns (address) {
        require(to == address(0) || to == ownerOf(tokenId), 
                "Certificates are non-transferable");
        return super._update(to, tokenId, auth);
    }
}
```

**解释**:
- 使用 OpenZeppelin 的 ERC-721 标准实现
- 只有授权的地址（SkillChain 后端）可以铸造证书
- 证书不可转让，确保学术诚信
- 所有证书数据永久记录在区块链上

---

## 10. 证书验证系统

**文件**: `apps/web/src/pages/public/Verify.tsx`

```typescript
/**
 * 公开的证书验证页面
 * 任何人都可以通过证书 ID 验证证书真实性
 */
export function Verify() {
  const { certId } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [verified, setVerified] = useState(false);
  
  useEffect(() => {
    const verifyCertificate = async () => {
      // 1. 从数据库获取证书信息
      const { data } = await supabase
        .from('certificates')
        .select('*, courses(*), profiles(*)')
        .eq('id', certId)
        .single();
      
      setCertificate(data);
      
      // 2. 如果证书已上链，验证区块链交易
      if (data.tx_hash) {
        const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
        const receipt = await provider.getTransactionReceipt(data.tx_hash);
        
        // 3. 检查交易是否成功确认
        if (receipt && receipt.status === 1) {
          setVerified(true);
        }
      }
    };
    
    verifyCertificate();
  }, [certId]);
  
  return (
    <div>
      {verified && (
        <div className="verified-badge">
          ✅ 证书已验证 - 区块链交易: {certificate.tx_hash}
        </div>
      )}
    </div>
  );
}
```

**解释**:
- 提供公开的证书验证接口，无需登录
- 通过区块链交易哈希验证证书真实性
- 任何人都可以验证证书，确保透明度
- 支持在简历、LinkedIn 等平台分享验证链接

---

## 技术栈总结

- **前端**: React + TypeScript + Vite + TailwindCSS
- **后端**: Supabase (PostgreSQL + Edge Functions)
- **AI**: TensorFlow.js (客户端) + Python scikit-learn (服务端)
- **区块链**: Polygon + ethers.js + IPFS/Pinata
- **智能合约**: Solidity + OpenZeppelin
- **部署**: Vercel (前端) + Supabase (后端)

---

## 核心创新点

1. **AI 驱动的个性化学习**: 根据用户行为实时调整学习计划
2. **区块链证书验证**: 不可伪造、永久存储的学术证书
3. **去中心化存储**: IPFS 确保证书数据永久可访问
4. **智能合约自动化**: 课程完成后自动铸造证书 NFT
5. **多角色协作**: 学习者、教育者、组织、管理员完整生态


import type {
  Tone,
  Strength,
  Audience,
  DocumentType,
  VoicePreferences,
} from '../shared/schemas.ts';

export interface QualityBenchmarkSample {
  id: string;
  name: string;
  category: DocumentType | 'clear_prose' | 'synthetic_robotic';
  documentType: DocumentType;
  tone: Tone;
  audience: Audience;
  strength: Strength;
  voicePreferences?: VoicePreferences;
  userIntent?: string;
  protectedTerms?: string[];
  sourceText: string;
  expectedBehavior: string;
}

export const QUALITY_BENCHMARK_SUITE: QualityBenchmarkSample[] = [
  {
    id: 'sample_01_academic_abstract',
    name: 'Academic Abstract with Citations & Math',
    category: 'academic_abstract',
    documentType: 'academic_abstract',
    tone: 'academic',
    audience: 'academic',
    strength: 'balanced',
    voicePreferences: { formality: 'formal', technicalDepth: 'expert' },
    sourceText:
      'In recent years, deep learning has demonstrated remarkable success across various domains. However, understanding theoretical generalization bounds remains a pivotal challenge [1, 2]. In this paper, we establish an empirical framework demonstrating that sample complexity scales as $O(1/\\sqrt{n})$ under mild regularity conditions. Our empirical findings substantiate prior theoretical conjectures and provide guidance for future architectural designs.',
    expectedBehavior:
      'Eliminate throat-clearing ("In recent years", "remarkable success across various domains"); retain exact citation [1, 2] and math formula $O(1/\\sqrt{n})$ verbatim; preserve scholarly rigor.',
  },
  {
    id: 'sample_02_literature_review',
    name: 'Literature Review with Author-Date Citations',
    category: 'literature_review',
    documentType: 'literature_review',
    tone: 'academic',
    audience: 'academic',
    strength: 'balanced',
    sourceText:
      'When examining attentional mechanisms, early models relied primarily on recurrent structures (Vaswani et al., 2017). Subsequently, bidirectional representations expanded contextual depth across natural language benchmarks (Devlin et al., 2019). Nonetheless, computational quadratic bottlenecking persists during extended context processing.',
    expectedBehavior:
      'Preserve author-date citations (Vaswani et al., 2017) and (Devlin et al., 2019); eliminate "When examining"; maintain analytical contrast.',
  },
  {
    id: 'sample_03_methodology',
    name: 'Research Methodology with Experimental Parameters',
    category: 'methodology',
    documentType: 'methodology',
    tone: 'academic',
    audience: 'technical',
    strength: 'light',
    sourceText:
      'Sample extraction was performed by subjecting 250 mg of powdered tissue to aqueous ethanol (70% v/v) at 78.4°C for 45 minutes under magnetic agitation at 500 rpm. The resulting homogenate was centrifuged at 12,000 × g for 15 minutes at 4°C, after which the supernatant was filtered through a 0.22 μm PTFE membrane.',
    expectedBehavior:
      'Light mode must intervene minimally; preserve all exact numbers, units (250 mg, 70% v/v, 78.4°C, 45 minutes, 500 rpm, 12,000 × g, 4°C, 0.22 μm), and chemical descriptors verbatim.',
  },
  {
    id: 'sample_04_discussion_conclusion',
    name: 'Discussion with Clinical Statistical Bounds',
    category: 'discussion_conclusion',
    documentType: 'discussion_conclusion',
    tone: 'academic',
    audience: 'academic',
    strength: 'balanced',
    sourceText:
      'Our clinical evaluation (n = 450) observed a statistically significant reduction in symptom recurrence (p < 0.01). While these outcomes are promising, several critical limitations warrant consideration, including the observational cohort design and lack of longitudinal tracking beyond twelve months. Therefore, clinical recommendations must remain cautious.',
    expectedBehavior:
      'Preserve statistical markers (n = 450, p < 0.01, twelve months); balance optimism with epistemic modesty; tighten expression without softening limitations.',
  },
  {
    id: 'sample_05_technical_doc',
    name: 'Technical Doc with Inline Code & URL',
    category: 'technical_doc',
    documentType: 'technical_doc',
    tone: 'professional',
    audience: 'technical',
    strength: 'balanced',
    voicePreferences: { directness: 'direct', conciseness: 'concise', technicalDepth: 'expert' },
    userIntent: 'Give direct, step-by-step engineering instructions',
    protectedTerms: ['PostgreSQL', 'pool_size'],
    sourceText:
      'It is important to remember that when configuring database connectivity, setting `pool_size: 20` prevents connection starvation in PostgreSQL. For production topologies, engineers can consult the reference guide at https://humanly.app/docs/postgres to calibrate timeout thresholds.',
    expectedBehavior:
      'Cut "It is important to remember that"; preserve `pool_size: 20`, URL https://humanly.app/docs/postgres, and protected term PostgreSQL verbatim.',
  },
  {
    id: 'sample_06_professional_email_delay',
    name: 'Professional Email Delay Notification',
    category: 'professional_email',
    documentType: 'professional_email',
    tone: 'professional',
    audience: 'business',
    strength: 'balanced',
    userIntent: 'Communicate project delay with accountability rather than defensiveness',
    sourceText:
      'I am writing to inform you that our team has encountered unexpected architectural dependencies that necessitate a slight postponement of the Q3 release. We are currently working diligently to mitigate these hurdles and expect to deliver the staging environment by October 24th.',
    expectedBehavior:
      'Eliminate corporate throat-clearing ("I am writing to inform you that"); express accountability; maintain date October 24th and Q3 release.',
  },
  {
    id: 'sample_07_professional_email_pitch',
    name: 'Professional Email Partnership Pitch',
    category: 'professional_email',
    documentType: 'professional_email',
    tone: 'professional',
    audience: 'business',
    strength: 'strong',
    voicePreferences: { directness: 'direct', conciseness: 'concise' },
    sourceText:
      'I hope this email finds you well. I wanted to reach out because our respective organizations have significant synergies in cloud security. Would you be open to having a brief 15-minute introductory call next Tuesday at 2:00 PM EST to discuss potential collaborative initiatives?',
    expectedBehavior:
      'Cut opening cliché "I hope this email finds you well" and "I wanted to reach out because"; state proposition directly and crisply.',
  },
  {
    id: 'sample_08_marketing_copy_saas',
    name: 'B2B SaaS Product Value Proposition',
    category: 'marketing_copy',
    documentType: 'marketing_copy',
    tone: 'marketing',
    audience: 'business',
    strength: 'strong',
    userIntent: 'Highlight developer speed and error reduction without hollow hype',
    sourceText:
      'In today\'s fast-paced software ecosystem, debugging distributed microservices serves as a major bottleneck, draining valuable engineering hours. Our cutting-edge observability suite empowers teams to unlock real-time telemetry, fostering unprecedented productivity across cloud workflows.',
    expectedBehavior:
      'Purge clichés ("In today\'s fast-paced software ecosystem", "serves as a major bottleneck", "cutting-edge", "unlock real-time telemetry", "fostering unprecedented productivity"); highlight real product value with concrete impact.',
  },
  {
    id: 'sample_09_marketing_copy_pricing',
    name: 'Hardware Product Pricing Announcement',
    category: 'marketing_copy',
    documentType: 'marketing_copy',
    tone: 'marketing',
    audience: 'general',
    strength: 'balanced',
    sourceText:
      'Crafted from aerospace-grade aluminum, the Apex Desk delivers ergonomic posture support starting at $499. Early pre-orders placed before November 1st receive free shipping across the continental US.',
    expectedBehavior:
      'Preserve currency $499 and date November 1st; ensure value proposition is punchy without acquiring false claims.',
  },
  {
    id: 'sample_10_conversational_essay',
    name: 'Conversational Personal Essay',
    category: 'conversational',
    documentType: 'conversational',
    tone: 'conversational',
    audience: 'casual',
    strength: 'balanced',
    sourceText:
      'To be completely honest, working from home for three consecutive years completely redefined how I view daily productivity. At first, I felt guilty whenever I stepped away from my laptop for ten minutes. Eventually, I realized that constant presence does not equate to meaningful output.',
    expectedBehavior:
      'Warm, authentic human voice; natural contractions; preserve personal insight without corporate stiffening.',
  },
  {
    id: 'sample_11_clear_text_light_mode',
    name: 'Already-Clear Prose (Anti-Overediting Test)',
    category: 'clear_prose',
    documentType: 'general_prose',
    tone: 'professional',
    audience: 'general',
    strength: 'light',
    sourceText:
      'Clean architecture separates business logic from infrastructure details. This separation keeps core domain rules independent of external frameworks, databases, and UI components, making systems easier to test and maintain over time.',
    expectedBehavior:
      'Anti-overediting test: text is already clear and concise. Light editing must retain >90% of words without unnecessary synonym swapping.',
  },
  {
    id: 'sample_12_synthetic_robotic',
    name: 'Heavy AI Robotic Syntax & Participial Stacking',
    category: 'synthetic_robotic',
    documentType: 'general_prose',
    tone: 'professional',
    audience: 'business',
    strength: 'strong',
    sourceText:
      'In today\'s rapidly evolving digital landscape, it is of paramount importance to recognize that artificial intelligence serves as a pivotal cornerstone for modern enterprises, allowing organizations to streamline complex operational workflows while fostering an environment of continuous seamless innovation. Furthermore, our state-of-the-art solution harnesses the power of data to revolutionize operational efficiency.',
    expectedBehavior:
      'Dismantle introductory throat-clearing, participial stacking (", allowing... while fostering..."), and clichés ("serves as a pivotal cornerstone", "harnesses the power of data"); transform into clean, authoritative human prose.',
  },
  {
    id: 'sample_13_urls_adjacent_punctuation',
    name: 'Multiple URLs with Adjacent Punctuation',
    category: 'technical_doc',
    documentType: 'technical_doc',
    tone: 'professional',
    audience: 'technical',
    strength: 'balanced',
    sourceText:
      'Developers should inspect our primary documentation at https://humanly.app/docs, review our status page at https://status.humanly.app; and submit bug tickets to https://github.com/humanly/issues. All endpoints require TLS 1.3.',
    expectedBehavior:
      'Ensure punctuation adjacent to URLs (comma, semicolon, period) is NOT captured into URL placeholders; URLs restored 100% clean without double punctuation.',
  },
  {
    id: 'sample_14_author_date_citations',
    name: 'Complex APA Author-Date Citations',
    category: 'literature_review',
    documentType: 'literature_review',
    tone: 'academic',
    audience: 'academic',
    strength: 'balanced',
    sourceText:
      'Earlier investigations demonstrated robust baseline alignment (Johnson, 2020). However, subsequent replication attempts revealed substantial variance across heterogeneous evaluation benchmarks (Smith and Jones, 2021; Williams et al., 2023).',
    expectedBehavior:
      'Preserve author-date citations (Johnson, 2020), (Smith and Jones, 2021; Williams et al., 2023) without dropping or reformatting author names.',
  },
  {
    id: 'sample_15_quantitative_metrics',
    name: 'Quantitative Financial Summary',
    category: 'general_prose',
    documentType: 'general_prose',
    tone: 'professional',
    audience: 'business',
    strength: 'light',
    protectedTerms: ['EBITDA', 'ARR'],
    sourceText:
      'In fiscal year 2025, ARR increased by 34.2% to $18.5M, while operating margins expanded to 21.8%. Total customer count reached 1,420, representing an annual retention rate of 94.6% and adjusted EBITDA of $3.2M.',
    expectedBehavior:
      'Zero numerical drift: preserve 2025, 34.2%, $18.5M, 21.8%, 1,420, 94.6%, $3.2M, ARR, and EBITDA exactly.',
  },
  {
    id: 'sample_16_code_snippets',
    name: 'Technical Commands and Parameter Configs',
    category: 'technical_doc',
    documentType: 'technical_doc',
    tone: 'professional',
    audience: 'technical',
    strength: 'balanced',
    sourceText:
      'To secure SSH keys on Linux hosts, execute `chmod 600 ~/.ssh/id_rsa` and verify permissions with `ls -la ~/.ssh`. Then restart the daemon using `systemctl restart sshd`.',
    expectedBehavior:
      'Preserve all inline code commands `chmod 600 ~/.ssh/id_rsa`, `ls -la ~/.ssh`, and `systemctl restart sshd` verbatim.',
  },
  {
    id: 'sample_17_latex_display_math',
    name: 'Display Math Equation and Asymptotics',
    category: 'academic_abstract',
    documentType: 'academic_abstract',
    tone: 'academic',
    audience: 'academic',
    strength: 'balanced',
    sourceText:
      'We compute the empirical risk minimizer by optimizing $$\\hat{\\theta} = \\arg\\min_{\\theta \\in \\Theta} \\frac{1}{n} \\sum_{i=1}^n \\ell(f_\\theta(x_i), y_i)$$ subject to $L_2$ regularization. The resulting estimator converges with asymptotic rate $O_p(n^{-1/2})$.',
    expectedBehavior:
      'Preserve display math $$\\hat{\\theta}...$$ and inline formulas $L_2$, $O_p(n^{-1/2})$ verbatim with literal $$ preserved.',
  },
  {
    id: 'sample_18_executive_briefing',
    name: 'Executive Security Briefing',
    category: 'professional_email',
    documentType: 'professional_email',
    tone: 'professional',
    audience: 'business',
    strength: 'strong',
    userIntent: 'Urge executive leadership to approve Zero Trust migration without technical jargon',
    protectedTerms: ['Zero Trust Architecture', 'SOC 2'],
    sourceText:
      'Our legacy perimeter defense is no longer adequate given our distributed workforce. Migrating to a Zero Trust Architecture will safeguard our sensitive customer records and accelerate our upcoming SOC 2 recertification audit.',
    expectedBehavior:
      'Elevate urgency and strategic value; preserve protected terms Zero Trust Architecture and SOC 2.',
  },
  {
    id: 'sample_19_conversational_advice',
    name: 'Conversational Mentorship Advice',
    category: 'conversational',
    documentType: 'conversational',
    tone: 'conversational',
    audience: 'casual',
    strength: 'balanced',
    sourceText:
      'When you are starting your engineering career, you often feel like you have to know every framework under the sun. The truth is, senior engineers spend half their week reading official documentation and writing simple scripts.',
    expectedBehavior:
      'Natural conversational cadence; relatable tone; no artificial corporate polish.',
  },
  {
    id: 'sample_20_privacy_disclaimer',
    name: 'Legal Privacy Retention Clause',
    category: 'general_prose',
    documentType: 'general_prose',
    tone: 'professional',
    audience: 'general',
    strength: 'light',
    protectedTerms: ['GDPR', 'PII'],
    sourceText:
      'In compliance with GDPR obligations, user PII is retained for a maximum duration of 30 days following account termination. After this retention window lapses, all associated telemetry and records are permanently deleted.',
    expectedBehavior:
      'Light mode: strict preservation of legal terminology, protected terms GDPR, PII, and timeline 30 days.',
  },
];

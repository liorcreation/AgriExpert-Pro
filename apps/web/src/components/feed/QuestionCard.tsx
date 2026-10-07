import { useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Camera, CheckCircle2, Clock3, MapPin, MessageCircle, PlayCircle, ThumbsUp } from 'lucide-react';
import { feedCategoryLabels } from '../../data/feed';
import type { FeedQuestion } from '../../types/feed';
import { AudioResponsePlayer } from './AudioResponsePlayer';

export function QuestionCard({ question, index, onReply, onReaction }: { question: FeedQuestion; index: number; onReply: () => void; onReaction?: (reacted: boolean) => Promise<void> | void }) {
  const [liked, setLiked] = useState(Boolean(question.reacted));
  const initials = question.authorName.split(' ').map((item) => item[0]).join('').slice(0, 2);

  return (
    <motion.article className="ag-feed-question" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} transition={{ duration: .35, delay: Math.min(index * .05, .18) }}>
      <div className="ag-feed-question-top"><div className="ag-feed-author"><span className="ag-feed-author-avatar">{initials}</span><div><strong>{question.authorName}</strong><span><MapPin className="h-3 w-3" />{question.authorLocation}<i /> <Clock3 className="h-3 w-3" />{question.createdAt}</span></div></div><span className="ag-feed-question-status">{question.answer ? <><CheckCircle2 className="h-3.5 w-3.5" /> Suivi par un expert</> : <><Clock3 className="h-3.5 w-3.5" /> En attente</>}</span></div>
      <div className="ag-feed-question-tags"><span className={`ag-feed-category ag-feed-category-${question.category}`}>{feedCategoryLabels[question.category]}</span>{question.hasVoice && <span className="ag-feed-voice-tag"><PlayCircle className="h-3 w-3" /> Note vocale</span>}{question.hasPhoto && <span className="ag-feed-voice-tag"><Camera className="h-3 w-3" /> Photo diagnostic</span>}</div>
      <h2>{question.title}</h2><p className="ag-feed-question-body">{question.body}</p>{question.voiceUrl && <div className="ag-feed-question-audio"><div><PlayCircle className="h-4 w-4" /><span>Note vocale du producteur</span></div><audio controls preload="metadata" src={question.voiceUrl} /></div>}{(question.photoUrl || question.photoPreview) && <img className="ag-feed-question-photo" src={question.photoUrl ?? question.photoPreview} alt={`Photo de diagnostic : ${question.title}`} loading="lazy" />}
      <div className="ag-feed-question-footer"><span className="ag-feed-answer-count"><MessageCircle className="h-4 w-4" /> {question.answerCount} réponse{question.answerCount > 1 ? 's' : ''}</span><button type="button" className={liked ? 'ag-feed-question-action ag-feed-question-action-liked' : 'ag-feed-question-action'} onClick={() => { const next = !liked; setLiked(next); void onReaction?.(next); }} aria-pressed={liked}><ThumbsUp className="h-3.5 w-3.5" /> {liked ? `Utile${question.usefulCount ? ` · ${question.usefulCount}` : ''}` : 'Marquer utile'}</button><button type="button" className="ag-feed-reply" onClick={onReply}>Répondre <span>→</span></button></div>
      {question.answer ? <div className="ag-feed-answer"><div className="ag-feed-answer-head"><span className="ag-feed-expert-avatar">{question.answer.initials}</span><div><div className="ag-feed-answer-name"><strong>{question.answer.expertName}</strong>{question.answer.certified && <span><BadgeCheck className="h-3 w-3" /> Expert certifié</span>}</div><small>{question.answer.expertRole} · {question.answer.createdAt}</small></div><ShieldMark /></div><p className="ag-feed-answer-body">{question.answer.body}</p><AudioResponsePlayer text={question.answer.body} language={question.answer.language} /></div> : <div className="ag-feed-pending"><span><Clock3 className="h-4 w-4" /></span><div><strong>Question ouverte à la communauté</strong><small>Un spécialiste disponible pourra vous répondre prochainement.</small></div><button type="button" onClick={onReply}>Proposer une réponse</button></div>}
    </motion.article>
  );
}

function ShieldMark() {
  return <span className="ag-feed-shield-mark"><BadgeCheck className="h-4 w-4" /></span>;
}

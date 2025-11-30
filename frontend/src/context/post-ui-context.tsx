/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { Comment, Critique, Post } from '@types';

interface PostUIContextValue {
  // Modal visibility
  showPostForm: boolean;
  setShowPostForm: (value: boolean) => void;
  showCommentForm: boolean;
  setShowCommentForm: (value: boolean) => void;
  showCritiqueForm: boolean;
  setShowCritiqueForm: (value: boolean) => void;
  showPraiseListModal: boolean;
  setShowPraiseListModal: (value: boolean) => void;
  showTrophyModal: boolean;
  setShowTrophyModal: (value: boolean) => void;
  showTrophyListModal: boolean;
  setShowTrophyListModal: (value: boolean) => void;
  showHeartListModal: boolean;
  setShowHeartListModal: (value: boolean) => void;

  // Active selections
  activePost: Post | null;
  setActivePost: (post: Post | null) => void;
  selectedPost: Post | null;
  setSelectedPost: (post: Post | null) => void;
  selectedComment: Comment | null;
  setSelectedComment: (comment: Comment | null) => void;
  selectedCritique: Critique | null;
  setSelectedCritique: (critique: Critique | null) => void;
  selectedPostForPraiseList: string | null;
  setSelectedPostForPraiseList: (postId: string | null) => void;
  selectedPostForTrophy: string | null;
  setSelectedPostForTrophy: (postId: string | null) => void;
  selectedPostForTrophyList: string | null;
  setSelectedPostForTrophyList: (postId: string | null) => void;
  selectedPostForHeartList: string | null;
  setSelectedPostForHeartList: (postId: string | null) => void;
  selectedPostTrophyAwards: string[];
  setSelectedPostTrophyAwards: Dispatch<SetStateAction<string[]>>;
  commentTargetPostId: string | null;
  setCommentTargetPostId: (postId: string | null) => void;
  editingComment: boolean;
  setEditingComment: (value: boolean) => void;
  critiqueTargetPostId: string | null;
  setCritiqueTargetPostId: (postId: string | null) => void;
  editingCritiqueForm: boolean;
  setEditingCritiqueForm: (value: boolean) => void;

  // UI flags
  dropdownOpen: string | null;
  setDropdownOpen: (id: string | null) => void;
  expandedPost: string | null;
  setExpandedPost: (id: string | null) => void;
  editing: boolean;
  setEditing: (value: boolean) => void;
  editingCritique: boolean;
  setEditingCritique: (value: boolean) => void;

  // Helpers
  openPostForm: (post?: Post | null) => void;
  closePostForm: () => void;
  openPostModal: (post: Post) => void;
  closePostModal: () => void;
  closeCommentForm: () => void;
}

const PostUIContext = createContext<PostUIContextValue | undefined>(undefined);

export function PostUIProvider({ children }: { children: ReactNode }) {
  const [showPostForm, setShowPostForm] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showCritiqueForm, setShowCritiqueForm] = useState(false);
  const [showPraiseListModal, setShowPraiseListModal] = useState(false);
  const [showTrophyModal, setShowTrophyModal] = useState(false);
  const [showTrophyListModal, setShowTrophyListModal] = useState(false);
  const [showHeartListModal, setShowHeartListModal] = useState(false);

  const [activePost, setActivePost] = useState<Post | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [selectedCritique, setSelectedCritique] = useState<Critique | null>(null);
  const [selectedPostForPraiseList, setSelectedPostForPraiseList] = useState<string | null>(null);
  const [selectedPostForTrophy, setSelectedPostForTrophy] = useState<string | null>(null);
  const [selectedPostForTrophyList, setSelectedPostForTrophyList] = useState<string | null>(null);
  const [selectedPostForHeartList, setSelectedPostForHeartList] = useState<string | null>(null);
  const [selectedPostTrophyAwards, setSelectedPostTrophyAwards] = useState<string[]>([]);
  const [commentTargetPostId, setCommentTargetPostId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState(false);
  const [critiqueTargetPostId, setCritiqueTargetPostId] = useState<string | null>(null);
  const [editingCritiqueForm, setEditingCritiqueForm] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingCritique, setEditingCritique] = useState(false);

  const openPostForm = (post?: Post | null) => {
    if (post) {
      setSelectedPost(post);
      setEditing(true);
    }
    setShowPostForm(true);
  };

  const closePostForm = () => {
    setShowPostForm(false);
    setSelectedPost(null);
    setEditing(false);
  };

  const openPostModal = (post: Post) => setActivePost(post);
  const closePostModal = () => setActivePost(null);

  const closeCommentForm = () => {
    setShowCommentForm(false);
    setSelectedComment(null);
    setEditingComment(false);
    setCommentTargetPostId(null);
  };

  const value = useMemo<PostUIContextValue>(
    () => ({
      showPostForm,
      setShowPostForm,
      showCommentForm,
      setShowCommentForm,
      showCritiqueForm,
      setShowCritiqueForm,
      showPraiseListModal,
      setShowPraiseListModal,
      showTrophyModal,
      setShowTrophyModal,
      showTrophyListModal,
      setShowTrophyListModal,
      showHeartListModal,
      setShowHeartListModal,
      activePost,
      setActivePost,
      selectedPost,
      setSelectedPost,
      selectedComment,
      setSelectedComment,
      selectedCritique,
      setSelectedCritique,
      selectedPostForPraiseList,
      setSelectedPostForPraiseList,
      selectedPostForTrophy,
      setSelectedPostForTrophy,
      selectedPostForTrophyList,
      setSelectedPostForTrophyList,
      selectedPostForHeartList,
      setSelectedPostForHeartList,
      selectedPostTrophyAwards,
      setSelectedPostTrophyAwards,
      commentTargetPostId,
      setCommentTargetPostId,
      editingComment,
      setEditingComment,
      critiqueTargetPostId,
      setCritiqueTargetPostId,
      editingCritiqueForm,
      setEditingCritiqueForm,
      dropdownOpen,
      setDropdownOpen,
      expandedPost,
      setExpandedPost,
      editing,
      setEditing,
      editingCritique,
      setEditingCritique,
      openPostForm,
      closePostForm,
      openPostModal,
      closePostModal,
      closeCommentForm,
    }),
    [
      showPostForm,
      showCommentForm,
      showCritiqueForm,
      showPraiseListModal,
      showTrophyModal,
      showTrophyListModal,
      showHeartListModal,
      activePost,
      selectedPost,
      selectedComment,
      selectedCritique,
      selectedPostForPraiseList,
      selectedPostForTrophy,
      selectedPostForTrophyList,
      selectedPostForHeartList,
      dropdownOpen,
      expandedPost,
      editing,
      editingCritique,
      selectedPostTrophyAwards,
      commentTargetPostId,
      editingComment,
      critiqueTargetPostId,
      editingCritiqueForm,
    ],
  );

  return <PostUIContext.Provider value={value}>{children}</PostUIContext.Provider>;
}

export function usePostUI() {
  const context = useContext(PostUIContext);
  if (!context) {
    throw new Error('usePostUI must be used within a PostUIProvider');
  }
  return context;
}


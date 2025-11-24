import type {
  Pagination,
  Critique,
  CritiqueForm,
  CritiqueReplyForm,
  CommentPagination,
} from "@types";
import type { Dispatch, SetStateAction } from "react";

export type PostContextType = {
  comments;
  setComments;
  commentForm;
  setCommentForm;
  editing;
  setEditing;
  commentPagination: { [postId: string]: CommentPagination };
  loadingComments: { [postId: string]: boolean };
  fetchCommentsForPost: (
    postId: string,
    page: number,
    append: boolean
  ) => Promise<void>;
  loadMoreComments: (postId: string) => Promise<void>;
  handleCommentSubmit: (e: React.FormEvent) => Promise<void>;
  deleteComment: (commentId: string, postId: string) => Promise<void>;
  setSelectedComment;
  showCommentForm;
  setShowCommentForm;

  // Posts
  posts;
  setPosts,
  pagination;
  expandedPost;
  setExpandedPost;
  selectedPost;
  setSelectedPost;
  postForm;
  setPostForm;
  showPostForm;
  setShowPostForm;
  loading;
  setLoading;
  loadingMore;
  setLoadingMore;
  submittingPost: boolean;
  setSubmittingPost: Dispatch<SetStateAction<boolean>>;
  fetchPosts;
  handlePostSubmit;
  deletePost;
  handlePostFormChange;
  dropdownOpen;
  setDropdownOpen;
  activePost;
  setActivePost;

  resetForms;

  // Hearting Functionality
  heartPost;
  unheartPost: (postId: string) => Promise<void>;
  loadingHearts: { [postId: string]: boolean };

  // Reply functionality
  replyForms;
  loadingReplies;
  handleReplySubmit;
  fetchRepliesForComment;
  setupReplyForm;
  handleReplyFormChange;
  toggleReplies;
  toggleReplyForm;

  // Critique states
  critiques: { [postId: string]: Critique[] };
  loadingCritiques: { [postId: string]: boolean };
  critiquePagination: { [postId: string]: Pagination };
  showCritiqueForm: boolean;
  critiqueForm: CritiqueForm;
  editingCritique: boolean;
  selectedCritique: Critique | null;
  submittingCritique: boolean;

  // Critique methods
  fetchCritiquesForPost: (
    postId: string,
    page: number,
    append: boolean
  ) => Promise<void>;
  handleCritiqueSubmit: (e: React.FormEvent) => Promise<void>;
  deleteCritique: (critiqueId: string, postId: string) => Promise<void>;
  setShowCritiqueForm: (show: boolean) => void;
  setCritiqueForm: Dispatch<SetStateAction<CritiqueForm>>
  setEditingCritique: Dispatch<SetStateAction<boolean>>
  setSelectedCritique: Dispatch<SetStateAction<Critique | null>>
  setSubmittingCritique: Dispatch<SetStateAction<boolean>>

  // Critique reply states
  critiqueReplyForms: { [critiqueId: string]: CritiqueReplyForm };
  loadingCritiqueReplies: { [critiqueId: string]: boolean };
  submittingCritiqueReply: { [critiqueId: string]: boolean };

  // Critique reply methods
  handleCritiqueReplySubmit: (
    e: React.FormEvent,
    critiqueId: string
  ) => Promise<void>;
  fetchRepliesForCritique: (critiqueId: string) => Promise<void>;
  setupCritiqueReplyForm: (critiqueId: string) => void;
  handleCritiqueReplyFormChange: (critiqueId: string, text: string) => void;
  toggleCritiqueReplies: (critiqueId: string) => void;
  toggleCritiqueReplyForm: (critiqueId: string) => void;

  // Praise states
  loadingPraise: { [postId: string]: boolean };
  praiseStatus: { [postId: string]: { count: number; isPraised: boolean } };
  showPraiseListModal: boolean;
  selectedPostForPraiseList: string | null;

  // Praise methods
  praisePost: (postId: string) => Promise<void>;
  fetchPraiseStatus: (postId: string) => Promise<void>;
  openPraiseListModal: (postId: string) => void;
  closePraiseListModal: () => void;

  // Trophy states
  loadingTrophy: { [postId: string]: boolean };
  trophyStatus: { [postId: string]: { counts: any; userAwarded: string[] } };
  showTrophyModal: boolean;
  selectedPostForTrophy: string | null;
  showTrophyListModal: boolean;
  selectedPostForTrophyList: string | null;

  // Trophy methods
  awardTrophy: (postId: string, trophyType: string) => Promise<void>;
  fetchTrophyStatus: (postId: string) => Promise<void>;
  openTrophyModal: (postId: string) => void;
  closeTrophyModal: () => void;
  setShowTrophyModal: Dispatch<SetStateAction<boolean>>;
  openTrophyListModal: (postId: string) => void;
  closeTrophyListModal: () => void;
};

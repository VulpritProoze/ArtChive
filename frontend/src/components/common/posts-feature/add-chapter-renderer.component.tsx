import React from 'react'
import type { PostForm } from '@types';

type AddChapterRendererType = {
    postForm: PostForm,
    setPostForm,
}

const AddChapterRenderer: React.FC<AddChapterRendererType> = ({ postForm, setPostForm }) => {
    const handleChapterChange = (index: number, field: 'chapter' | 'content', value: string) => {
        const updatedChapters = [...postForm.chapters];
        updatedChapters[index] = { ...updatedChapters[index], [field]: value };
        setPostForm(prev => ({ ...prev, chapters: updatedChapters }));
      };
    
      const addChapter = () => {
        setPostForm(prev => ({
          ...prev,
          chapters: [...prev.chapters, { chapter: '', content: '' }]
        }));
      };
    
      const removeChapter = (index: number) => {
        if (postForm.chapters.length > 1) {
          const updatedChapters = postForm.chapters.filter((_, i) => i !== index);
          setPostForm(prev => ({ ...prev, chapters: updatedChapters }));
        }
      };

    return (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Chapters</h3>
            <button type="button" className="btn btn-sm btn-primary" onClick={addChapter}>
              Add Chapter
            </button>
          </div>
          
          {postForm.chapters.map((chapter, index) => (
            <div key={index} className="card bg-base-200 p-4 mb-4">
              {postForm.chapters.length > 1 && (
                <div className="flex justify-end mb-2">
                  <button type="button" className="btn btn-sm btn-error" onClick={() => removeChapter(index)}>
                    Remove
                  </button>
                </div>
              )}
              
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Chapter Number</span>
                </label>
                <input 
                  type="number"
                  className="input input-bordered"
                  value={chapter.chapter}
                  onChange={(e) => handleChapterChange(index, 'chapter', e.target.value)}
                  min="1"
                  required
                />
              </div>
              
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Content</span>
                </label>
                <textarea 
                  className="textarea textarea-bordered h-32"
                  value={chapter.content}
                  onChange={(e) => handleChapterChange(index, 'content', e.target.value)}
                  required
                />
              </div>
            </div>
          ))}
        </div>
    )
}

export default AddChapterRenderer
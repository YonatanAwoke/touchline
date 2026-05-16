import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { blogPosts, blogCategories, BlogPost } from "@/data/blogPosts";
import ThemeToggle from "@/components/ThemeToggle";

const PageNav: React.FC = () => {
  const navigate = useNavigate();
  return (
    <nav className="flex items-center justify-between px-8 py-5 md:px-16 lg:px-24">
      <h1 className="cursor-pointer text-2xl font-black italic tracking-tight" onClick={() => navigate("/")}>
        <span className="text-primary">TOUCH</span>
        <span className="text-foreground">LINE</span>
      </h1>
      <div className="hidden items-center gap-10 md:flex">
        <Link to="/" className="text-sm font-medium text-muted-foreground/70 hover:text-foreground transition-colors">Home</Link>
        <Link to="/blog" className="text-sm font-semibold text-foreground">Blog</Link>
        <Link to="/contact" className="text-sm font-medium text-muted-foreground/70 hover:text-foreground transition-colors">Contact</Link>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Button className="hidden rounded-lg px-6 font-bold italic md:inline-flex" onClick={() => navigate("/auth")}>
          Get Started
        </Button>
      </div>
    </nav>
  );
};

const FeaturedPost: React.FC<{ post: BlogPost }> = ({ post }) => (
  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
    <Link to={`/blog/${post.slug}`} className="group block overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-[16/10] w-full overflow-hidden">
        <img src={post.cover} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
      </div>
    </Link>
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <span className="inline-block rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
        {post.category}
      </span>
      <h2 className="mt-3 font-black italic text-2xl text-foreground md:text-3xl">{post.title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
      <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{post.author}</span>
        <span>·</span>
        <span>{format(parseISO(post.date), "MMM d, yyyy")}</span>
        <span>·</span>
        <span>{post.readMinutes} min read</span>
      </div>
      <Button asChild className="mt-6 rounded-lg px-6 font-bold italic">
        <Link to={`/blog/${post.slug}`}>
          Read more <ArrowRight size={16} className="ml-1" />
        </Link>
      </Button>
    </div>
  </div>
);

const PostCard: React.FC<{ post: BlogPost }> = ({ post }) => (
  <Link
    to={`/blog/${post.slug}`}
    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
  >
    <div className="aspect-[16/10] w-full overflow-hidden">
      <img src={post.cover} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
    </div>
    <div className="flex flex-1 flex-col p-5">
      <span className="inline-block w-fit rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-secondary-foreground">
        {post.category}
      </span>
      <h3 className="mt-3 font-bold italic text-base text-foreground line-clamp-2">{post.title}</h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
      <div className="mt-4 text-xs text-muted-foreground">
        {format(parseISO(post.date), "MMM d, yyyy")} · {post.readMinutes} min
      </div>
    </div>
  </Link>
);

const Blog: React.FC = () => {
  const [activeCategory, setActiveCategory] = React.useState<(typeof blogCategories)[number]>("All");
  const navigate = useNavigate();

  const filtered = activeCategory === "All" ? blogPosts : blogPosts.filter((p) => p.category === activeCategory);
  const featured = filtered[0] ?? blogPosts[0];
  const rest = filtered.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <PageNav />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-6 md:px-10">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <h1 className="font-black italic text-4xl text-foreground md:text-5xl">Blog &amp; articles</h1>

        <div className="mt-6 flex flex-wrap gap-2">
          {blogCategories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeCategory === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-8">
          <FeaturedPost post={featured} />
        </div>

        {rest.length > 0 && (
          <>
            <div className="mt-16 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Blog and articles</span>
            </div>
            <h2 className="mt-3 font-black italic text-3xl text-foreground md:text-4xl">Latest insights and trends</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Blog;
